# AI Usage Timeline

Chrome Manifest V3 bővítmény, amely 15 percenként elmenti a Claude és a Codex rövid, illetve heti használati keretének kihasználtságát, majd idősoros grafikonon jeleníti meg.

## Telepítés

1. Nyisd meg a `chrome://extensions` oldalt.
2. Kapcsold be a **Fejlesztői módot**.
3. Kattints a **Kicsomagolt bővítmény betöltése** gombra, majd válaszd ki ezt a könyvtárat.
4. Jelentkezz be ugyanebben a Chrome-profilban a [claude.ai](https://claude.ai) és a [chatgpt.com](https://chatgpt.com) oldalakon.
5. Kattints a bővítmény ikonjára a dashboard megnyitásához, majd az első kézi frissítéshez.

Az automatikus mérés gyakorisága a dashboard fejlécében található **Beállítások** oldalon 5, 10, 15, 30 vagy 60 percre állítható. Ugyanitt külön kapcsolható a Claude és a Codex mérése, valamint kiválasztható, melyik rövid vagy heti érték jelenjen meg az ikon jelvényén.

## Működés és adatvédelem

- A bővítmény a két szolgáltatás webes felülete által használt, nem dokumentált belső usage végpontokat olvassa.
- Ha a közvetlen háttérkérés nem kapja meg a munkamenet-cookie-t, rövid időre egy inaktív usage fület nyit, ugyanott olvassa ki a JSON adatot, majd bezárja a fület.
- A bővítmény beszélgetéseket, promptokat és API-kulcsokat nem olvas.
- Minden mérés a `chrome.storage.local` tárhelyen marad, legfeljebb 90 napig.
- A belső végpontok változhatnak, ezért a bővítmény külön jelzi, ha valamelyik szolgáltatás formátuma már nem felismerhető.

## Teszt

```bash
npm test
```
