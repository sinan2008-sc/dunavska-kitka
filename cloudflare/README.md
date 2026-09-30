# Дунавска китка — Cloudflare без банкова карта

Подготвен проект; не е публикуван и не е извършено прехвърляне на данни.
Публичният сайт остава в GitHub Pages. Сървърът и админ панелът са Workers.
Няма зависимост от Cloudflare Access, Zero Trust или R2.

## Вход

Всеки администратор има имейл и отделна парола (минимум 12 знака).
Паролите са PBKDF2-SHA256 с уникална сол и 100000 итерации (лимит на Workers).
Сесиите са случайни 256-битови токени; D1 пази само SHA256 отпечатъка.
Cookie е Secure, HttpOnly, SameSite=Strict, __Host-; срок 12 часа.
Смяната на парола прекратява всички сесии на профила.
Входът и първоначалната настройка ограничават опитите по IP и имейл.
Записването изисква същия Origin. Публичният API премахва cookies/идентичности.

## Настройване

1. Workers Free и D1; не активирайте R2 или Zero Trust.
2. Създайте D1 база и изпълнете SQL от drizzle/0000_blue_katie_power.sql,
   drizzle/0001_easy_kat_farrell.sql и drizzle/0002_cardless.sql.
3. В wizard изберете repository sinan2008-sc/dunavska-kitka и име
   dunavska-kitka-admin. Кодът е в cloudflare/ на main, отделно от статичните
   файлове на GitHub Pages. Не е нужен избор на клон при първото създаване.
4. Build variables: CF_ACCOUNT_ID, CF_DATABASE_ID, CF_ADMIN_OWNER_EMAIL.
   Build command (когато няма Root directory поле):
   cd cloudflare && npx pnpm@11.25.0 install --frozen-lockfile && npm run build && npm run cf:configure
   Deploy command: cd cloudflare && npm run cf:deploy
   Ако има Root directory, задайте cloudflare и пропуснете cd cloudflare &&.
   Изключете Preview builds. GitHub Pages продължава да сервира root файловете.
5. В Settings → Variables & Secrets добавете SECRET ADMIN_SETUP_TOKEN.
   Генерирайте поне 32 случайни знака в password manager, не споделяйте в чат/GitHub.
6. Отворете /admin/setup на admin Worker: имейлът трябва да съвпада с
   CF_ADMIN_OWNER_EMAIL; въведете избраната парола и setup token.
   Създаването е еднократно и атомично. След него изтрийте ADMIN_SETUP_TOKEN secret.
7. /admin/accounts добавя следващи администратори и сменя пароли.
   Не изпращайте чужди пароли през публичен канал.
8. Публикувайте отделния public-worker.mjs чрез npm run cf:deploy-api
   (нужна е генерираната wrangler.public.json). Той използва service binding SERVER.
   Не позволява вход, качване или административни промени; достъпни са
   публични данни, записвания, гласуване и снимки.

## Снимки и видео

Снимки JPG/PNG/WebP до 5 MB се съхраняват на части в D1.
Базата Free има общ лимит 500 MB; base64 използва около 33% повече място.
Това решение е подходящо за малък брой снимки, не за голям медиен архив.
Клиповете се добавят чрез HTTPS линк (YouTube или директен видео адрес).
Не се поддържа качване на видео към D1. Не е възможно надеждно блокиране
на запис на екрана или извличане на публично достъпно видео.

## Прехвърляне и включване

Изнесете ПЪЛНИ records и votes от стария сървър в частен JSON.
Не използвайте съкратени записи от инструменти и не качвайте лични данни в GitHub.
node scripts/import-data.mjs /private/export.json създава import.sql.
Изпълнете го в новата D1. Качените стари снимки се прехвърлят отделно;
ключовете и адресите трябва да се запазят. Старите видео файлове изискват
външно хранилище и актуализация на адресите преди включване.
Променете API адреса в публичния GitHub Pages source чак след проверка на
вход, администратори, групи, снимки, записвания, анкети и мигрирани записи.
Старият сайт/сървър остават налични до успешно приключване.

## Проверки

npm test — пароли и публичен gateway.
npm run build — production bundle.
