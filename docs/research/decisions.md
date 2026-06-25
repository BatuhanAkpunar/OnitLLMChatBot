# Onit AI — Ajan Tartışması ve Kararlar (2026-06)

4 persona sub-agent bağımsız çalıştı (skeptik PM, ajan-ekibi-karşıtı contrarian,
indie builder, conversational UX kritiği). Hepsi `docs/research/findings.md` +
gerçek kodu okudu. Çıktıları aşağıda sentezlendi.

## Oybirliğiyle saptanan kök sorun
**Synthesis (sentez) katmanı yok.** Bugün her rol kendi mesaj bloğunu stream
ediyor; `orchestration.ts` 3 role kadar dağıtıyor, rol başına tek görev, tek
otoriter artefakt YOK. Karar en sonda/gömülü kalıyor. Bu tek yapısal eksik hem
"sadece wrapper" hem "ajan ekibi tiyatro" eleştirisinin kaynağı, hem builder'ın
zamanını harcıyor, hem bilişsel yükü maksimuma çıkarıyor.

Dört agent'ın da #1 önerisi aynı: **önce Onit'in sentezi gelsin; rol çıktıları
onun altında etiketli, tekrarsız, katlanmış insert'lere dönüşsün. Birincil cevap
asla ham paralel rol blokları olmasın. PRD gerçek, sabitlenmiş, sürümlenen bir
artefakt olsun (transcript değil).**

## Kararlar (öncelik sırası)

### D1 — Sentez-önce, TEK artefakt (en yüksek kaldıraç)
- Çok-rollü çalıştırmada cevap önce Onit'in sentezlenmiş kararı/PRD'si olarak
  gelir. Rol katkıları altında "ekip düşüncesini göster" ile açılır.
- Birincil yüzey ham rol bloğu değil, büyüyen tek doküman.

### D2 — Varsayılan tek-ses; çok-rol istisna
- `orchestration.ts` varsayılanı tek rol; 2./3. rol için rationale'da açık
  gerekçe şart. Refleksif fan-out kalkar.

### D3 — Rol sözleşmeleri: çakışma yok
- PM: kapsam + metrik + TEK öneri + en riskli varsayım + en ucuz test. Seçenek
  listesi yasak (kararsızlık yasak).
- Analyst: known/assumed/unknown + kabul kriterleri.
- QA: yalnız test/edge-case tablosu (untestable nag kalkar).
- Designer: UX akış. Project Manager: sıralama/bağımlılık.
- Her rol kısa; tekrar = iki hallucination riski.

### D4 — Hafıza yük taşısın ve görünür olsun (tek gerçek moat)
- Sentezlenen PRD'de "Standing context" başlığı: bu dokümanı şekillendiren
  benimsenmiş karar/kurallar, satır içi atıfla ("karar #4 gereği").
- Başlık altında ince "Proje bağlamı" şeridi. Benimsenen şey tekrar sorulmaz.

### D5 — Transcript değil PRD export
- "Copy PRD" / "Export .md" yalnız spec'i verir, sohbeti değil.

### D6 — Workslop'a karşı "ne değişti ve neden"
- Her PRD revizyonunda ekibin neye meydan okuduğu, hangi varsayımı öldürdüğü,
  neyi kestiği görünür.

### D7 — Bilişsel yük: sessiz ekip
- Per-teammate "thinking" pill'leri yerine tek "Onit ekibi koordine ediyor
  (2/4)" satırı. Rol mesajlarında 46px avatar → küçük nokta+isim, gövde
  klamplı.
- Plan kartı varsayılan katlanmış ("Onit 4 adımlık plan çıkardı. Çalıştır /
  Düzenle"); onay-gate varsayılan yolda kalkar, step-by-step opt-in.

## Bu turda uygulama sırası
Önce kaynaktaki davranış (prompt/process: D2, D3, D1-sentez kuralı) çünkü en
yüksek kaldıraç/risk oranı ve kırılgan 2021 satırlık UI'a dokunmadan "tiyatro"yu
azaltır. Ardından düşük-riskli UI sadeleştirmeleri (D7). Büyük UI artefakt
yeniden-kurgusu (D1-canvas, D5) ayrı faz.
