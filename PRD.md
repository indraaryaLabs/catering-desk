# Catering Desk — FastTrack MVP PRD

## 1. Product brief
- **Product:** Catering Desk
- **Positioning:** Kelola pesanan katering dan persiapan produksi harian.
- **Audience:** Small Indonesian businesses; use realistic Indonesian sample data and Bahasa Indonesia UI.
- **Purpose:** Demo internal untuk usaha katering yang mengelola event, jumlah porsi, menu, jadwal, pembayaran, dan persiapan pesanan.
- **Portfolio goal:** demonstrate a working business workflow, polished UI, reliable calculations, validation, and maintainable frontend code.
- **Reference products:** CaterZen order entry, menus, delivery details, and kitchen production report patterns: https://www.caterzen.com/catering-management-software

## 2. MVP features — must implement
- Dashboard: pesanan hari ini, porsi yang harus disiapkan, pembayaran belum lunas, pesanan berikutnya.
- CRUD order berisi nama pelanggan, nomor kontak opsional, tanggal/jam acara, alamat singkat, menu, jumlah porsi, catatan, total dan DP.
- Katalog menu sederhana: nama, kategori, harga per porsi, status tersedia.
- Workflow: Inquiry, Dikonfirmasi, Persiapan, Siap Dikirim, Selesai, Dibatalkan.
- Agenda harian / daftar pesanan dengan filter tanggal, status, dan pencarian.
- Daftar produksi per hari yang mengagregasi porsi dari semua pesanan aktif; tidak menghitung order batal.
- localStorage, seeded demo data, ekspor CSV pesanan, ekspor/impor JSON, Reset Demo dengan konfirmasi.

## 3. Business rules and edge cases
- Total order = jumlah porsi × harga per porsi per item; validasi kuantitas bilangan bulat positif.
- Ringkasan produksi harus dikelompokkan per tanggal dan menu serta dapat dijelaskan dari data order.
- Tandai data contoh dengan jelas; jangan mengirim pesan atau memproses pembayaran otomatis.


## 4. UX/UI requirements
Follow `../../shared/DESIGN_SYSTEM.md`. Use a cohesive, premium SaaS workspace; a distinct app identity; responsive layout; consistent sidebar/top bar; good typography; thoughtful spacing; real loading-free local state; meaningful empty states; accessible forms; and natural Bahasa Indonesia throughout. Make the first view impressive with seeded data but ensure all metrics and tables derive from actual application state.

## 5. Technical constraints
- Standalone frontend app in this folder. Use **Vite + React + TypeScript**.
- Keep dependencies small and stable. Use `lucide-react` for icons. Use plain CSS/CSS modules or the lightest reliable styling setup already present. Do not spend time configuring a complex monorepo or design system package.
- No paid services, no API keys, no mandatory server, no login requirement, no paid fonts/images, no runtime dependency on external URLs.
- Persist demo data using versioned `localStorage`; initialize with realistic seed data on first run. Add a reset-to-demo control with confirmation. Provide export/import backup where specified.
- Currency in IDR; display dates in Indonesian locale (`id-ID`). Store numeric money values as integers in rupiah where appropriate.
- Treat imported JSON as untrusted: validate its basic schema before replacing local data; failed import must not destroy current data.
- Avoid `any` unless there is a documented reason. Extract business calculations into pure, testable functions.
- No remote messaging/payment automation. If a share action exists, use clipboard or `wa.me` link only, and never claim a message was sent automatically.

## 6. Out of scope — do not build
- Authentication, multi-user permissions, backend/API, cloud sync, payments, email/SMS/WhatsApp APIs, AI features, multi-tenant SaaS, mobile native apps, elaborate charts, or features not listed in this PRD.
- Do not add features merely to make the app appear bigger. Finish and test this MVP first.

## 7. Definition of done
- All must-have features in this PRD work end-to-end.
- UI is in Bahasa Indonesia; no lorem ipsum, broken links, dead buttons, fake chart values, or console errors from normal use.
- Data survives reload and the reset-demo flow works.
- Forms validate edge cases; important destructive actions require confirmation.
- `npm run build` succeeds; run lint/typecheck/tests if configured and fix findings. Include at least focused tests for key business rules.
- `README.md` includes install/run/build/test commands, features, architecture notes, demo limitations, and how to reset demo data.
- Include a final report distinguishing tests actually run from checks not performed. Never claim “zero bugs”; list known limitations honestly.

## 8. Scope boundary
MVP untuk operator katering kecil; bukan sistem resep, procurement, akuntansi, atau multi-cabang.
