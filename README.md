# CharLingo

This application is a little personal project I made to assist in my Spanish journey. My goal was to be able to read books, translate words and phrases, save flashcards, and later quiz myself on those cards.

The app currently only support EPUB files, I plan to support PDFs in the future as well. 

## Installing 

There are versions for Android devices, Windows, macOS, and Linux, all available on the release page. I can only personally test the Android, Windows, and Linux versions so I make no promise of the macOS one fully functioning every release.
- On Android, download the APK and run the installer. You will need to trust unknown sources in your device setting to install it.
- On Windows, download the setup exe or .msi package and run it. There will be similar warnings about an unknown publisher (that's me).
- On Linux, I tested the .deb package. Download that, then run `sudo apt install CharLingo_<release.version>_amd64.deb`. By default, the app is installed to /usr/bin/CharLingo and is currently built supporting Ubuntu 22.04.
- On macOS, I honestly don't know. The build generates the .dmg file, but I don't have or use any mac devices, sorry.

## How to use the app

When you first open the app, you will see something similar to this:
<img width="986" height="730" alt="image" src="https://github.com/user-attachments/assets/1d5c2fc7-0ece-429f-81a7-8d41c77183c5" />

This is your main library page, there's just no books yet. Hit the "Open File" button in the toolbar and select your favorite Spanish EPUB (not included in the application).
The application will open the book right away, but the book is also stored in your library. You can access the library at any time from the toolbar. 

You can swipe or use the arrow keys to change pages. You shouldn't need to scroll, the text is fit on the screen. 

While reading, you can select text to get a translation:
<img width="972" height="691" alt="image" src="https://github.com/user-attachments/assets/e8c64e80-02ef-40c6-a386-7837895899f6" />

From this screen, you can either close the dialog, or save it as a flashcard for later review. 

At the top of the screen, you can hit the "Flashcard" button to see all of your saved flashcards. 
<img width="982" height="751" alt="image" src="https://github.com/user-attachments/assets/121d7346-acdd-455f-929e-dda9b2b50805" />

From here, you can tap each card to see the translation again and review, or you can start a quiz. 
<img width="967" height="678" alt="image" src="https://github.com/user-attachments/assets/24a4e1fb-cf6c-46c2-b3f4-acd260d5b77d" />

The quiz will go through all of your cards, unless you quit early, and will ask you for the English translations of the Spanish words and phrases you saved.
At the end, you will have a small summary of your performance. <img width="980" height="621" alt="image" src="https://github.com/user-attachments/assets/808668ad-f959-4ba7-8d9e-c42107e00f10" />
You'll also see that your flashcards now have counters to show how often you've gotten them right out of all of the times you saw it in a quiz. You can sort the flashcard list by this statistic to see your worst words.

The corner of the taskbar also has a settings wheel, which is pretty straight forward. 

<img width="315" height="423" alt="image" src="https://github.com/user-attachments/assets/4c1ca8e2-dbaa-49c0-bad4-504cdaff1357" />

The "Flashcard Mode" is where you can change flashcards to always show the translation, or initially just show the Spanish phrase and let you quiz yourself on each card.

## Issues
I imagine most of the people that see this will be those that know me personally and will tell me about issues, but please report anything odd or not working, and give me suggestions for changes and new features. I'm hoping to continue working on this as I use it more in my daily life. This is my first project based around React and Tauri, and initially started as an experiment with using AI to support coding (I honestly hated it). I spent most of the time just fixing things that the AI got wrong, so I imagine there are going to still be remaining issues. At some point in the future, I will probably completely rewrite the app without AI to get rid of the spaghetti code throughout this app. 

Thanks!


