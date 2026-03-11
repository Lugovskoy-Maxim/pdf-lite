This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Desktop-приложение (Windows и Linux)

Приложение можно собрать как десктопное с автообновлением через GitHub Releases.

### Разработка

1. В одном терминале запустите Next.js: `npm run dev`
2. В другом: `npm run electron:dev` — откроется окно Electron с приложением с http://localhost:3000

### Сборка установщиков

- **Локально (все платформы):** `npm run electron:build`
- **Только Windows:** `npm run electron:build:win`
- **Только Linux:** `npm run electron:build:linux`

Артефакты появятся в папке `dist/` (установщики NSIS/Portable для Windows, AppImage/deb для Linux).

### Автообновление

Приложение при запуске проверяет [Releases](https://github.com/tomilo/pdf-lite/releases) на наличие новой версии. Если версия в релизе выше текущей, обновление скачивается в фоне; пользователю показывается предложение перезапустить приложение для установки.

Чтобы выпустить обновление:

1. Обновите `version` в `package.json`.
2. Создайте и запушьте тег: `git tag v0.1.0 && git push origin v0.1.0`
3. GitHub Actions соберёт установщики и создаст релиз с артефактами.

В `package.json` в блоке `build.publish` укажите свой `owner` и `repo`, если репозиторий другой.
