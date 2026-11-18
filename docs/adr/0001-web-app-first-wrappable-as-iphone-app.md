# A web app first, kept wrappable as an iPhone app

Wimmelstadt is built as a web app: the collector adds it to the Home Screen of their iPhone Duo, where it runs full screen as an always-on display, and opens the same app in a browser on their Windows desktop. The first leaning was a native iOS app, but that needs a Mac to build, Apple's paid developer programme to stay installed for more than a week, and a second implementation for the desktop, while a web app needs none of these and can be run and checked on the development machine. The build stays wrappable in a native shell, which we will only do if the web version cannot hold up on the Duo or a Lock Screen or StandBy widget becomes worth having.

## Considered Options

- **Native iOS app.** Best performance and the only route to widgets, at the cost listed above.
- **A game engine that exports to web and iOS.** One codebase, but its web builds are heavy on a phone and it sits outside the collector's TypeScript tooling.

## Consequences

- The Duo sets the performance budget, and the app must be the open app with the screen kept awake.
- Nothing may depend on a capability that exists only in a desktop browser.
