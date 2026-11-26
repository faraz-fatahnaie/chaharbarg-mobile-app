# Iran-specific research (as of 28 Oct 2026)

Method: web searches plus direct reads of the rules pages. **Verified** = I read the source text. **Snippet** = only a search-result summary, not read in full. **Unverified** = I could not find a source. Nothing here is legal advice.

## 1. Distribution

### Android — local stores (primary channel)
- **Cafe Bazaar** and **Myket** are the two stores with developer billing SDKs. Cafe Bazaar's billing SDK is **Poolakey**; official wrappers exist for Flutter ([cafebazaar/flutter_poolakey](https://github.com/cafebazaar/flutter_poolakey)) and React Native ([cafebazaar/react-native-poolakey](https://github.com/cafebazaar/react-native-poolakey)). [Snippet]
- Myket publishes SDKs/plugins for Unity, Cordova, Flutter and .NET and says to validate purchase signatures server-side ([Myket KB](https://myket.ir/kb/en/pages/understanding-myket-in-app-purchase-concepts), [NuGet MyketPayment](https://www.nuget.org/packages/MyketPayment)). [Snippet]
- **Capacitor path (what this project uses):** [capacitor-poolakey](https://www.npmjs.com/package/capacitor-poolakey) (v6.0.0) and [@salarizadi/capacitor-cafebazaar-poolakey](https://www.pkgstats.com/pkg:@salarizadi/capacitor-cafebazaar-poolakey) wrap Poolakey; [cordova-plugin-android-iab](https://npmjs.org/package/cordova-plugin-android-iab) documents both Bazaar and Myket. No Capacitor plugin for Myket was found. [Snippet]
  - **Unsure:** whether these community plugins work with Capacitor 8 (this app). Plan: try them first, otherwise write a ~100-line native plugin around Poolakey and Myket's Android billing library.
- Google Play is **not** a target: a source claims Google bans Iranian developers from Play Developer accounts, but it is an opinion piece ([dev.to](https://dev.to/habibi_dev/googles-over-compliance-is-doing-the-regimes-job-a-letter-from-an-iranian-full-stack-developer-39em)). [Unverified] Treat Google Play, Play Billing, Firebase, FCM, Google Fonts, AdMob as unavailable. The app already avoids all of them (fonts are bundled; nothing calls Google).

### iOS
- Apple removed Iranian developers' apps in 2017 citing US sanctions ([TechCrunch](https://techcrunch.com/2017/01/29/apple-has-allegedly-begun-removing-iranian-ios-apps-from-the-app-store/), [BuzzFeed News](https://www.buzzfeednews.com/article/pranavdixit/apple-is-pulling-apps-by-iranian-developers-from-the-app)). [Snippet]
- A 2026 paper characterises Iranian **third-party iOS stores** (cracked/sideloaded apps; sanctions plus censorship block the App Store and its CDN for users in Iran) ([arXiv 2604.26343](https://arxiv.org/abs/2604.26343)). [Snippet]
- A June 2026 news item (Russian-language) says local developers launched **SibApp** and another catalogue **Anardoni**, and that Iranian businesses largely moved to **PWAs in Safari**; it also warns profiles/PWAs raise data-leak risk ([techora.ru](https://techora.ru/news/iran-zapustil-sibapp-alternativu-app-store-2026-06-26)). [Single source; unverified elsewhere]
- **Conclusion:** the realistic iOS channels are (1) an installable **PWA** (this build already has a manifest and offline service worker), (2) third-party iOS stores via signed IPA. An official App Store release for users in Iran is not realistic. **Unsure:** how reliable third-party stores are, their terms, and certificate revocation risk.
- A hybrid decision follows from this: the web build is a first-class product, not a demo.

## 2. Payments
- Real-money payments in Iran go through Shaparak-approved PSPs (e.g. Zarinpal is reported approved; PayPat was reported as an in-app-purchase platform) ([The Paypers](https://thepaypers.com/ecommerce/iranian-ecommerce-regulators-green-light-payment-gateways--767467), [allpays.ir](https://allpays.ir)). [Snippet]
- For Android the simplest compliant route is the store's own billing (Bazaar/Myket). A direct gateway (Zarinpal) would be needed for the web/PWA build and requires a registered business and probably the Enamad trust seal. **Unverified:** whether virtual currency in games needs extra licensing; sources conflicted on Enamad for game payments. **Ask a local lawyer/accountant before enabling real payments.**
- Prices in `data/cosmetics.ts` are placeholders in Toman.

## 3. Ads
- **Tapsell** (mediation SDK; Flutter plugin [tapsell_plus](https://pub.dev/packages/tapsell_plus), Cordova plugin, Unity artifact `ir.tapsell.plus:tapsell-plus-sdk-unity` on [Maven Central](https://central.sonatype.com/artifact/ir.tapsell.plus/tapsell-plus-sdk-unity)) [Snippet]; **Adivery** has a [JS SDK](https://www.npmjs.com/package/adivery-js) [Snippet]; **Yektanet**: nothing found. API specifics (request/show split for rewarded video) were seen only for the Cordova plugin.
- This app uses an `AdProvider` interface (`src/lib/services.ts`) with a labelled mock; a Tapsell Capacitor/Cordova bridge is the first adapter to build.
- Design rule kept: rewarded ads only on Home and the Result screen; never during a hand.

## 4. Developer tooling and sanctions
- GitHub restricted accounts in Iran in 2019 and announced full availability after a US licence in January 2021 ([GitHub blog](https://github.blog/news-insights/policy-news-and-insights/advancing-developer-freedom-github-is-fully-available-in-iran/)). [Snippet] — this repo is on GitHub.
- **Unverified:** current reachability from Iranian IPs of npm, Maven Central/Google Maven (Android Gradle), pub.dev, Unity and Godot downloads. A community mirror for pub.dev exists in China (flutter-io.cn) but that does not settle the question. Mitigation used: a small dependency set (React, Vite, Capacitor, Vazirmatn font), no runtime network calls, lockfile committed; for Android builds vendor the Gradle caches or use a mirror.
- Also unverified: whether Iranian developers can hold Apple Developer accounts (assume no).

## 5. Content, culture and regulation (important)
- **Card-game sensitivity.** A search result from Wikishia says most Shia jurists consider playing with playing cards impermissible even without betting ([fa.wikishia.net](https://fa.wikishia.net/view/ورق‌بازی)). [Snippet, not verified in depth] Pasur is nonetheless widely played and several Pasur apps exist (e.g. a [Cafe Bazaar hokm app](https://cafebazaar.ir/app/ir.doorbash.hokm) appeared in results), but stores or regulators may be sensitive. I could **not** find Cafe Bazaar/Myket's actual content policy for card games. **Action: read the stores' publisher policies before submitting.**
- **Age rating.** Iran's game rating system is **ESRA/ERSA** (age bands 3/7/12/15/18; criteria include gambling) run under the National Foundation for Computer Games; foreign games without a licence are reported to be filtered ([Wikipedia](https://en.wikipedia.org/wiki/Entertainment_Software_Rating_Association), [Hamshahri](https://www.hamshahrionline.ir/news/113959/همشهری آنلاین), [Mehr](https://www.mehrnews.com/news/6127821/شبکه-مقابله-با-بازی-های-غیراخلاقی-ایجاد-می-شود)). [Snippet; reports dated] **Unverified:** whether mobile games distributed through Bazaar/Myket must register. Consequence for design: the game must not look like gambling — no real-money stakes, no cash-out, no betting-style UI. Shahi are described as game points; entry fees are framed as "arena entry".
- **Site selection.** Arenas use secular heritage sites only. Two notes where I partly **disagree** with the brief's list: *Naqsh-e Jahan Square* and *Yazd's old city* contain famous mosques — scenes show only the arcades/Ali Qapu palace and the wind-towers; *Chogha Zanbil* was an Elamite temple complex, but as a 3,000-year-old ruin it is not a place of present-day worship, so I kept it. Persepolis, bridges, gardens, palaces, bazaars: no concerns.
- **Art.** Original flat vector shapes only; no photos, no traced artwork, no brand names. Deck art is "Ganjifeh-inspired" ornament, not a copy.
- **Currency names.** "شاهی (Shahi)" is a historical coin and also colloquial for a very small sum; used only as a game-point name. "گوهر (Gohar, jewel)" is fine. "Toman" is only used for real prices.

## 6. Rules sources
Pagat, Wikipedia and Jahanshiri, summarised with conflicts in `docs/rules-spec.md`. Not found in any source: **Sur Sarbaz** (it exists only in the docx), "capture several groups in one play" (no source allows it).

## 7. What I am least sure about
1. Store policy on Pasur and on virtual currency (Bazaar/Myket).
2. Whether Capacitor-compatible Poolakey/Myket plugins work with Capacitor 8.
3. Registration/rating duties for a mobile game in Iran.
4. Reachability of build tooling from inside Iran.
5. Third-party iOS store reliability.
