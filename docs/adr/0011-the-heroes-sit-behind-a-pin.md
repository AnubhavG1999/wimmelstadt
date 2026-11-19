# The heroes sit behind a PIN

The published app shows the city to anybody, and the heroes only to whoever has the collector's PIN. Heroes are made from the collector's own pictures, so they could not be public, and the collector wanted something to hand to a friend: "if i share it with someone they get access". The brief had planned a sign-in by a one-time code sent by email, for the collector alone. That is still what adding a diecast from the phone will need, and it is not built. Seeing the heroes needs only the PIN.

The PIN is the password of one account in the backend, which every viewer shares. An account must also be on a list kept in the database before it can see anything, and with the PIN a viewer can read the heroes and change nothing.

## Considered Options

- **Heroes that anybody can see.** They are made from private pictures.
- **An account for each viewer, by invitation.** More to run than a hobby needs, and the collector asked for one thing to share.
- **A PIN that the backend checks itself**, with viewers signed in without a name. That would mean keeping the PIN's hash and counting wrong tries ourselves. As the password of an account, the sign-in service does both.
- **The collector's account alone.** Nobody else could watch.

## Consequences

- Everybody shares one account, so one viewer cannot be shut out alone. Changing the PIN ends every session, and every device asks for the new one.
- A PIN is only as strong as its digits. The sign-in service limits wrong tries, and that is the only guard.
- A device that has been unlocked keeps the heroes, so that the city never waits for the backend, as [0004](0004-a-personal-backend-the-city-never-waits-for.md) asks. What a device has been given cannot be taken back from it. The app forgets its copy when it is locked or finds that the PIN has changed.
- Nobody can make an account for themselves: sign-ups are off, and the list of who may view is a second lock behind that.
- The account's address is not a real mailbox, so a PIN cannot be reset by mail. The collector changes it in the backend's dashboard.
- Heroes are sent from the collector's desk, with the backend's secret key, which is fetched each time it is needed and is never printed, saved or checked in.
- The PIN itself is written nowhere: not in the repository, not in a document, not in a note.
