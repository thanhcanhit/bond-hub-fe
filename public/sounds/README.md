# Sound Files for Call Functionality

The following sound files are used for call functionality:

1. `call-sound.mp3` - Used for incoming calls (when receiving a call)
2. `waiting-call.mp3` - Used for outgoing calls (when making a call)
3. `discord-notification.mp3` - General notification sound
4. `call-ringtone.mp3` - (Optional) Alternative ringtone for incoming calls
5. `call-dialtone.mp3` - (Optional) Alternative dial tone for outgoing calls

Note: The code has been updated to use `call-sound.mp3` for incoming calls and `waiting-call.mp3` for outgoing calls.

## Recommended Sources

You can find royalty-free sound effects from:

- [Mixkit](https://mixkit.co/free-sound-effects/ringtone/)
- [Zapsplat](https://www.zapsplat.com/sound-effect-categories/telephones/)
- [Freesound](https://freesound.org/search/?q=ringtone)

## Usage

These sounds are used by the call components to provide audio feedback during calls:

- `FloatingIncomingCall.tsx` plays the ringtone when receiving a call
- `CallingUI.tsx` plays the dial tone when making a call
