"use client"

/**
 * upload.ts — imaginile pe care utilizatorul le încarcă singur pentru fragmente.
 *
 * Merge în bucket-ul `fragment-images`, pe calea `<user_id>/<uuid>.<ext>`.
 * Primul segment al căii E id-ul proprietarului, iar politicile RLS se sprijină
 * pe asta ca să nu poată nimeni scrie în folderul altcuiva
 * (vezi supabase/migrations/005_fragment_images.sql — TREBUIE rulată, altfel
 * orice upload eșuează cu „Bucket not found").
 *
 * DE CE REDIMENSIONĂM ÎNAINTE SĂ TRIMITEM:
 * un card de pe board are câteva sute de pixeli pe latură. O poză de telefon are
 * 12 megapixeli și câțiva MB. Dacă am urca originalul, board-ul ar descărca
 * megabytes ca să-i afișeze la 150px — exact problema pe care am reparat-o la
 * imaginile de muzeu (vezi `thumbUrl` în components/collage/FragmentContent.tsx).
 * Așa că facem DOUĂ variante: una „mare" pentru vizualizare în detaliu și un
 * thumbnail pe care îl randează cardul. Bonus: uploadul e mult mai rapid.
 */

import { supabase } from "./client"
import type { FragmentImageMeta } from "@/types"

const BUCKET = "fragment-images"

/** Tipurile pe care le acceptăm. Orice altceva e respins ÎNAINTE de upload. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/** Cât de mare poate fi fișierul ORIGINAL ales de utilizator. */
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

/** Latura maximă a variantei „mari" salvate. */
const FULL_MAX_PX = 1600

/** Latura maximă a thumbnail-ului randat în card. */
const THUMB_MAX_PX = 600

/** Calitatea JPEG pentru variantele redimensionate. */
const QUALITY = 0.85

/** Ce întoarce un upload reușit — exact câmpurile care intră în `imageMeta`. */
export interface UploadedImage {
  /** URL-ul public al variantei mari. Ajunge în `fragment.content`. */
  url: string
  /** URL-ul public al thumbnail-ului. Ajunge în `imageMeta.thumbUrl`. */
  thumbUrl: string
  /** Căile din bucket, păstrate ca să putem șterge fișierele mai târziu. */
  storagePath: string
  thumbStoragePath: string
}

/** Eroare cu mesaj deja prietenos, de arătat direct în dialog. */
export class UploadError extends Error {}

/**
 * Validează, redimensionează și încarcă o imagine aleasă de utilizator.
 *
 * @param file Fișierul din `<input type="file">` sau dintr-un drop.
 * @throws UploadError cu un mesaj lizibil (tip greșit, prea mare, nelogat, bucket lipsă).
 */
export async function uploadFragmentImage(file: File): Promise<UploadedImage> {
  // 1. Validăm ÎNAINTE să atingem rețeaua — un fișier greșit nu merită un drum.
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadError("That file isn't an image. Use a JPG, PNG, WebP or GIF.")
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new UploadError(`That image is ${mb} MB. The limit is 8 MB.`)
  }

  // 2. Avem nevoie de id-ul utilizatorului: el E primul segment al căii, deci
  //    fără el nu putem respecta politica RLS.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new UploadError("You need to be signed in to upload an image.")

  // 3. Redimensionăm. GIF-urile le lăsăm neatinse: un canvas ar păstra doar
  //    primul cadru și am strica animația fără să ceară nimeni asta.
  const isGif = file.type === "image/gif"
  const full = isGif ? file : await resize(file, FULL_MAX_PX)
  const thumb = isGif ? file : await resize(file, THUMB_MAX_PX)

  // 4. Urcăm ambele variante. Numele au același prefix, ca să fie ușor de
  //    recunoscut perechea când te uiți în bucket.
  const id = crypto.randomUUID()
  const ext = isGif ? "gif" : "jpg"
  const storagePath = `${user.id}/${id}.${ext}`
  const thumbStoragePath = `${user.id}/${id}-thumb.${ext}`

  await put(storagePath, full)
  try {
    await put(thumbStoragePath, thumb)
  } catch (err) {
    // Thumbnail-ul a picat după ce varianta mare a urcat: curățăm, ca să nu
    // rămână un fișier la care nu se referă nimeni.
    await deleteFragmentImage({ storagePath })
    throw err
  }

  return {
    url: publicUrl(storagePath),
    thumbUrl: publicUrl(thumbStoragePath),
    storagePath,
    thumbStoragePath,
  }
}

/**
 * Șterge din bucket fișierele unei imagini încărcate.
 *
 * Primește direct `imageMeta` (sau orice obiect cu cele două căi), fiindcă de
 * acolo vin mereu. Pentru imaginile de muzeu căile lipsesc și funcția nu face
 * nimic — le afișăm prin hotlink, nu deținem niciun fișier.
 *
 * Nu aruncă: ștergerea e curățenie, iar un eșec aici nu trebuie să blocheze
 * ștergerea fragmentului în sine (altfel userul ar rămâne cu un card pe care
 * nu-l poate scoate de pe board din cauza unui fișier).
 */
export async function deleteFragmentImage(
  meta: Pick<FragmentImageMeta, "storagePath" | "thumbStoragePath"> | undefined | null,
): Promise<void> {
  const paths = [meta?.storagePath, meta?.thumbStoragePath].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  )
  if (paths.length === 0) return

  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) console.error("deleteFragmentImage:", error.message)
}

// --------------------------------------------------------------------------- //
// Interne
// --------------------------------------------------------------------------- //

/** Urcă un blob și traduce erorile Supabase în mesaje lizibile. */
async function put(path: string, body: Blob): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: body.type || "image/jpeg",
    upsert: false, // calea conține un UUID proaspăt; o coliziune ar fi un bug
  })
  if (!error) return

  // Cea mai probabilă cauză la prima rulare: migrația n-a fost aplicată.
  if (/bucket/i.test(error.message)) {
    throw new UploadError(
      "Image storage isn't set up yet. Run supabase/migrations/005_fragment_images.sql " +
        "in the Supabase SQL editor, then try again.",
    )
  }
  throw new UploadError(error.message)
}

function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Micșorează imaginea ca latura cea mare să nu depășească `maxPx`, păstrând
 * proporțiile. Imaginile deja mai mici NU se măresc — ar fi doar pierdere de
 * calitate și octeți.
 *
 * Întoarce un JPEG: pentru fotografii e sensibil mai mic decât PNG, iar
 * transparența nu ne folosește la nimic într-un card opac de colaj.
 */
async function resize(file: File, maxPx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new UploadError("Your browser couldn't process that image.")

    // Fundal alb: un PNG transparent ar ieși cu negru peste tot în JPEG.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    )
    if (!blob) throw new UploadError("Your browser couldn't process that image.")
    return blob
  } finally {
    bitmap.close() // eliberăm memoria imaginii decodate
  }
}

/**
 * Șterge TOATE imaginile încărcate de utilizatorul curent.
 *
 * De ce există: ștergerea unei cărți (sau a întregului cont) elimină rândurile
 * din baza de date prin cascadă, dar fișierele din Storage NU au nicio legătură
 * cu acele chei străine — rămâneau acolo pentru totdeauna. Măsurat pe contul de
 * test: 16 fișiere orfane, cu zero cărți și zero fragmente în cont.
 *
 * Pentru „delete all my data" asta nu e doar neglijență de spațiu: pagina
 * /privacy promite ștergerea completă a datelor, iar pozele încărcate de om
 * sunt exact genul de date la care se referă promisiunea.
 *
 * Ștergem după folder (`<user_id>/`), nu după căile din `image_meta`: dacă o
 * salvare a eșuat la jumătate cândva, fișierul acela nu mai e referit de nimeni
 * și n-ar fi prins niciodată de o curățenie bazată pe fragmente.
 */
export async function deleteAllMyImages(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // `list` paginează; mergem până se golește, altfel pe un cont cu multe poze
  // am șterge doar primele 100.
  const PAGE = 100
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(user.id, { limit: PAGE, offset })
    if (error) {
      console.error("deleteAllMyImages:", error.message)
      return
    }
    if (!data || data.length === 0) return

    const paths = data.map((file) => `${user.id}/${file.name}`)
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
    if (removeError) {
      console.error("deleteAllMyImages:", removeError.message)
      return
    }
    // După ștergere, pagina următoare începe tot de la 0 (lista s-a scurtat).
    offset = -PAGE
  }
}

/**
 * Șterge imaginile încărcate ale fragmentelor unei cărți.
 *
 * Se cheamă ÎNAINTE de a șterge cartea: după ștergere, rândurile nu mai există
 * și n-am mai avea de unde afla ce fișiere îi aparțineau.
 */
export async function deleteImagesForBook(bookId: string): Promise<void> {
  const { data, error } = await supabase
    .from("fragments")
    .select("image_meta")
    .eq("book_id", bookId)
  if (error) {
    console.error("deleteImagesForBook:", error.message)
    return
  }

  const paths: string[] = []
  for (const row of data ?? []) {
    const meta = (row as { image_meta?: FragmentImageMeta | null }).image_meta
    if (meta?.storagePath) paths.push(meta.storagePath)
    if (meta?.thumbStoragePath) paths.push(meta.thumbStoragePath)
  }
  if (paths.length === 0) return

  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
  if (removeError) console.error("deleteImagesForBook:", removeError.message)
}
