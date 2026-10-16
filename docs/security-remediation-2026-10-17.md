# Remediasi keamanan NUX-01 sampai NUX-09

Diperbarui: 2026-10-17. Commit acuan: `989b56bf3d4056ed296f336a358cebf6755c72c9`.

Dokumen ini mencatat perbaikan hasil audit kode sumber. Status implementasi
terpisah dari pengujian lokal, kondisi deployment, dan penutupan oleh auditor ITSA.
Laporan ITSA asli, severity asli, CVSS, dan referensi halaman tidak tersedia.
Severity yang disebut merupakan penilaian audit kode ini; advisory NUX-02 juga
memiliki severity High dan CVSS 8.2 dari penerbitnya. Seluruh fixture memakai
identitas dummy. Tidak ada probe atau migrasi yang dijalankan pada produksi.

## Register temuan

| ID     | Judul asli ITSA | Severity/CVSS asli | Referensi halaman | Endpoint                                | Akar masalah                                                             | Tindakan perbaikan                                                                                                                     | Perubahan kode/commit                                            | Skenario uji                                                                                                              | Hasil/bukti                                                                                                  | Status implementasi | Status verifikasi lokal | Status deployment | Verifikasi ITSA            | PIC              | Tanggal pembaruan | Tindak lanjut                                                    |
| ------ | --------------- | ------------------ | ----------------- | --------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------- | ----------------- | -------------------------- | ---------------- | ----------------- | ---------------------------------------------------------------- |
| NUX-01 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Auth dan route API terlindungi          | Kewajiban enrollment hanya ditegakkan melalui navigasi browser           | Server memeriksa tujuan dan tingkat autentikasi sesi; sesi enrollment ditolak pada route bisnis                                        | Guard auth, strategi JWT, aktivasi, dan penanganan sesi frontend | Login/register/refresh yang belum menyelesaikan enrollment ditolak pada route bisnis; MFA/passkey terverifikasi diizinkan | JWT/controller unit + session-security E2E + smoke Bun: sesi enrollment 403, aktivasi menerbitkan token baru | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Rilis API dan frontend secara terkoordinasi                      |
| NUX-02 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Server Actions pada Next App Router     | Versi Next pada lockfile terdampak GHSA-p3m5-59mp-jv5r                   | Perbarui Next dan konfigurasi ESLint pasangannya ke 16.4.2; perbarui sharp ke versi perbaikan                                          | Manifest package dan bun.lock                                    | Periksa batas versi aman Next/sharp yang teresolusi; jalankan tes/build frontend                                          | Tes dependency terkunci lulus; Next 16.4.2 dan sharp 0.35.5 teresolusi                                       | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Periksa versi dalam image yang di-deploy                         |
| NUX-03 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Endpoint password, role, akun, dan sesi | Sesi lama tetap berlaku setelah perubahan keamanan                       | Tambahkan versi keamanan akun, cabut keluarga refresh token, periksa akun dan role terkini                                             | Repository user, layanan auth, strategi JWT, dan migrasi         | Access/refresh lama ditolak setelah perubahan password/role, penghapusan akun, atau logout; sesi sah tetap berfungsi      | Session-security E2E: password/role/delete/logout mencabut akses lama; smoke logout 401                      | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Migrasi memaksa pengguna dengan sesi lama untuk login ulang      |
| NUX-04 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Refresh/reset auth                      | Pembacaan dan konsumsi token berjalan terpisah                           | Konsumsi token bersyarat dalam transaksi dengan penguncian baris user                                                                  | Layanan auth                                                     | Refresh/reset bersamaan hanya memiliki satu pemenang; refresh yang bersaing dengan reset tidak memulihkan akses           | Session-security E2E PostgreSQL: race refresh/reset dan replay ditolak                                       | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Verifikasi migrasi dan perilaku database pada deployment         |
| NUX-05 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Verifikasi MFA dan WebAuthn             | Status challenge, percobaan, dan recovery tidak atomik                   | Reservasi/konsumsi Redis atomik, penguncian baris recovery, pencatatan hash TOTP untuk menolak replay, dan konsumsi challenge passkey  | Layanan two-factor/WebAuthn dan fasad Redis                      | Percobaan recovery/challenge bersamaan, replay, lalu faktor sah berikutnya                                                | Unit MFA/WebAuthn + E2E MFA: konsumsi atomik, recovery paralel dan replay                                    | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Redis harus mendukung GETDEL dan Lua; periksa sinkronisasi waktu |
| NUX-06 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | POST files dan tampilan file publik     | MIME dari klien dipercaya; ekstensi asli dipertahankan                   | Periksa signature/struktur konten dan ekstensi, seragamkan metadata, validasi key objek                                                | Fasad storage, validator konten, dan controller files            | Tolak HTML/JS/SVG tersamar, file terpotong/ekstensi tidak cocok, dan buffer terlalu besar; terima PNG sah                 | Unit storage/files + smoke Bun: PNG palsu 415, PNG sah 201 dan retrieval nosniff                             | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Verifikasi origin storage dan kebijakan bucket secara terpisah   |
| NUX-07 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Alur sesi kedua frontend                | Cache privat bertahan setelah pergantian identitas                       | Bersihkan/batalkan state privat, periksa generation sesi, urutkan request penerbit cookie, dan larang retry mutasi lintas identitas    | Kedua store auth, klien, integrasi query, dan notifikasi         | Pergantian akun, respons terlambat, race logout, dan peningkatan sesi setelah aktivasi                                    | Suite kedua frontend: pergantian identitas, cache, antrean cookie, retry aktivasi dan mutasi                 | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Uji penerimaan browser/deployment tetap terpisah                 |
| NUX-08 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Logging HTTP dan email reset            | Header kredensial, query, dan konten email dicatat mentah                | Hilangkan header/query request, redaksi cookie respons, gunakan error generik, dan catat metadata saja pada transport mail development | Opsi log HTTP, transport mail, dan filter exception              | Penanda dummy untuk kredensial/reset tidak masuk log; metadata yang berguna tetap tersedia                                | Unit opsi log/mail/filter dan validasi konfigurasi production lulus                                          | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Tinjau log lama, hak akses, dan retensinya                       |
| NUX-09 | Tidak tersedia  | Tidak tersedia     | Tidak tersedia    | Tujuan redirect frontend                | Pemeriksaan prefiks mengizinkan origin eksternal melalui slash-backslash | Tolak karakter kontrol/backslash dan normalisasi path internal dengan origin yang sama                                                 | Kedua helper intended-redirect                                   | Tolak tujuan eksternal dan escape terenkode; pertahankan path/query/hash internal                                         | Tes helper redirect kedua frontend: tujuan berbahaya ditolak, path internal diterima                         | Selesai             | Lulus pada sandbox      | Belum diketahui   | Belum diverifikasi auditor | Belum ditetapkan | 2026-10-17        | Verifikasi redirect login pada frontend yang di-deploy           |

## Perubahan implementasi dan operasional

- Access JWT mengikat versi keamanan akun, keluarga refresh token yang aktif,
  tujuan sesi, dan tingkat autentikasi. Klaim lama sebelum migrasi ditolak.
  Server membaca role terkini dan memastikan akun masih ada.
- Login, register, dan refresh mengembalikan `enrollmentRequired` bersama token
  dan user. Aktivasi MFA juga mengembalikan access token pengganti dan memasang
  cookie refresh pengganti. Browser mengikuti keputusan enrollment server
  meskipun flag fitur frontend belum diperbarui.
- Perubahan password/keamanan dan penerbitan token mengunci baris user yang sama.
  Pemakaian ulang refresh token mencabut seluruh keluarganya, termasuk token
  penerus dari request bersamaan yang lebih dahulu berhasil.
- TOTP yang berhasil dipakai dicatat selama 90 detik melalui hash yang terikat
  pada authenticator dan kode. Pemakaian ulang segera setelah aktivasi ditolak;
  gunakan recovery code atau tunggu periode kode berikutnya. Kegagalan Redis
  tidak melewati verifikasi.
- Body request dan respons proxy dibatasi 16 MiB selama pembacaan stream, dengan
  tenggat 30 detik. Ekspor besar mendatang memerlukan kebijakan streaming tersendiri.
- Konfigurasi production menolak transport mail `log` dan Swagger aktif dengan
  kredensial lemah/bawaan. Compose memakai SMTP dan menonaktifkan dokumentasi
  secara default. Seed demo menolak production sebelum membuat klien database.
- Validasi upload memakai pemeriksaan signature/struktur dengan batas pemrosesan,
  bukan decoder penuh atau pemindai malware. Storage upload publik tidak boleh
  menampung dokumen privat atau backup. Gunakan origin terpisah serta kebijakan
  bucket/IAM yang sesuai.

Migrasi sesi:
[`20261017010000_session_security`](../apps/api/drizzle/20261017010000_session_security/migration.sql).
Migrasi menambahkan field keamanan akun/refresh dan menghapus baris refresh lama.
Terapkan bersama rilis API dan kedua frontend secara terkoordinasi. Jangan
menjalankan API lama yang masih menyisipkan baris refresh tanpa field wajib baru.
Pengguna dengan sesi lama harus login ulang. Menonaktifkan MFA wajib tidak
meningkatkan sesi enrollment yang sudah terbit menjadi sesi penuh; login ulang
untuk memperoleh sesi baru.

## Lingkungan verifikasi

Verifikasi runtime memakai sandbox Linux Docker sementara: jaringan eksternal
ditutup, image sumber/toolchain tidak dapat diubah, environment dan kredensial
host tidak diteruskan, serta filesystem sementara dibatasi. Container tes memiliki
batas CPU, memori, PID, ukuran file, dan durasi. Cache compiler/modul native
menggunakan mount scratch terbatas; sumber dan dependency asli tetap read-only.

PostgreSQL dan Redis memakai storage sementara dalam namespace jaringan terisolasi
bersama yang hanya memiliki loopback. Migrasi, seed, dan tes HTTP hanya boleh
menargetkan layanan dummy tersebut. Pengunduhan dependency dilakukan terpisah
dengan lifecycle script dinonaktifkan, sebelum isolasi jaringan runtime diterapkan.

Perintah verifikasi di lingkungan tersebut:

```sh
bun run --filter @nuxion/shared-types build
# apps/api
bun run typecheck
bun run test
# Dist adalah mount read-only dengan scratch output. Hindari menghapus mount:
sed 's/"deleteOutDir": true/"deleteOutDir": false/' nest-cli.json > /scratch/nest-cli.json
bun run nest build --config ../../../scratch/nest-cli.json
bun run tsc-alias -p tsconfig.json
bun run db:migrate
bun run db:seed
bun run test:e2e
# apps/web-next
bun run test
bun run next typegen
bun run tsc --noEmit --incremental false
NODE_ENV=production bun run next build
# apps/web
bun run nuxt prepare
bun run test
bun run nuxt typecheck
NODE_ENV=production bun run nuxt prepare
# Build dengan output scratch agar Nitro tidak menghapus root mount .output:
NODE_ENV=production bun --eval 'import { loadNuxt, build } from "nuxt"; const nuxt = await loadNuxt({ cwd: process.cwd(), dev: false, overrides: { nitro: { output: { dir: "/scratch/nuxt-output" } } } }); await build(nuxt); await nuxt.close();'
# root, setelah build shared-types dan nuxt prepare
bun run lint
```

Hasil verifikasi akhir dicatat di bawah. Tes yang gagal tidak dinyatakan lulus
hanya berdasarkan tinjauan kode sumber.

- Runtime: Node 24.21.0, Bun 1.4.2, Vitest 5.0.2, PostgreSQL 18 dan Redis 7.
- API: 144 tes unit dan 90 tes E2E lulus; typecheck dan kompilasi Nest/tsc-alias lulus.
  Fixture PNG positif diperiksa ulang melalui tujuh tes storage setelah diperbaiki
  menjadi PNG dengan CRC sah. Tiga kasus tambahan hasil review akhir juga lulus: PDF 1.7/2.0 diterima dan
  password Swagger berisi spasi ditolak.
- Next.js: 113 tes pada 27 file dan typecheck lulus.
- Nuxt: 103 tes pada 20 file dan typecheck lulus. Vue language-core masih
  mengeluarkan warning plugin vue-router/volar/sfc-route-blocks yang tidak
  diekspor; proses typecheck tetap exit 0.
- Lint repo: exit 0, tanpa error; 20 warning lama pada komponen Vue dan tag img Next.
- Build production Next 16.4.2 dan Nuxt 4.5.2 lulus. Nuxt menggunakan
  override lokasi output Nitro ke scratch tanpa perubahan kode aplikasi.
  Percobaan CLI awal gagal saat menghapus root mount read-only `.output`;
  build dengan output scratch selesai menghasilkan bundle server 10,3 MB.
- Smoke HTTP pada API hasil kompilasi di Bun mode production lulus: health dengan
  PostgreSQL/Redis, login enrollment, endpoint bisnis 403, setup/aktivasi TOTP,
  penggantian access token dan cookie, token enrollment lama 401, HTML tersamar PNG
  415, PNG sah 201, retrieval byte/MIME/nosniff, dan token setelah logout 401.
  Harness hanya memakai akun, database, Redis, dan storage dummy.
- Warning tes yang masih ada: React act pada tes tabs/notifikasi, stub komponen
  Vue pada tes lama, serta URL localhost dari konfigurasi site fixture.
- Browser end-to-end, image deployment aktual, origin storage, IAM/bucket, TLS,
  proxy deployment, log historis, dan penutupan auditor belum diverifikasi.

Sumber regresi utama:

- NUX-01/03/04: `apps/api/test/session-security.e2e-spec.ts`,
  `apps/api/src/modules/auth/tests/jwt.strategy.spec.ts` dan `auth.controller.spec.ts`.
- NUX-05: `apps/api/test/two-factor.e2e-spec.ts`, tes layanan two-factor dan WebAuthn.
- NUX-06/08: tes storage, controller files, opsi HTTP log, filter exception dan env validation.
- NUX-07/09: tes auth-store, use-api/useApi, session-cache, session-requests,
  enrollment, security API, proxy dan intended-redirect pada kedua frontend.

## Tindak lanjut advisory dependency

Pembaruan dependency yang kompatibel mengurangi hasil OSV dari 62 ID advisory
pada lockfile acuan menjadi dua kandidat kecocokan pada 1.923 versi
package:

- `braces@3.0.3`: GHSA-vfj7-8cjw-p6xm, kehabisan stack akibat pola bersarang dalam.
- `node-forge@1.4.0`: GHSA-86w9-cpqp-85rv, parsing pada verifikasi signature.

Data OSV yang diperiksa belum mencantumkan versi perbaikan untuk kedua advisory.
Keduanya belum dinyatakan sebagai eksploit yang terjangkau melalui aplikasi.
Pantau perbaikan upstream dan pastikan jalur dependency sebelum mengganti package
atau memasang override. PIC: Belum ditetapkan. Advisory keamanan Next diperiksa
terpisah karena hasil scanner saja tidak mengidentifikasi NUX-02.

Referensi primer:

- [Pembaruan keamanan Next.js, 2026-10-14](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
- [DoS pada Next Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)
- [Advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [Advisory node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
