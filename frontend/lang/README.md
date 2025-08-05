# Translations of Pluto

The files in this directory are used to translate the Pluto frontend. This means that any text in the Pluto browser app can be displayed in a user's preferred language, which can really help to make Pluto and Julia more accessible to a wider audience!

Do you want to help translate Pluto? Awesome!! Here is **How it works**, and **How to contribute**:

## How it works

The frontend of Pluto is uses [i18next](https://www.i18next.com/) to manage translations, with a standard JSON format for translations. 

Every piece of user-facing text in the Pluto frontend goes through the `t` function, which returns a string in the user's preferred language. For example, if we want to `confirm` to ask the user something, then we DON'T USE:

```js
if(confirm("Are you sure you want to delete this cell?")) {
    // ...
}
```

Instead, we use:

```js
if(confirm(t("t_delete_cell_confirm"))) {
    // ...
}
```

The function `t` then returns the right string, taken from one of the JSON files in this directory. If the language is set to `en`, then it will return the string `"Are you sure you want to delete this cell?"`. If the language is set to `nl`, then it will return the string `"Weet je zeker dat je deze cel wilt verwijderen?"`.

By using `t` throughout Pluto's code, we can make any piece of text translatable!


### Translation strings
Take a look at some of the other translations to see the structure! Important to know:

#### Interpolation
Some strings include **interpolation**, like `"Welcome to {{pluto_logo}}"`. The frontend uses this to insert special content in these places. In your translation, be sure to include the exact same interpolation, but you can decide where it goes. For example, you can translate it to `"{{pluto_logo}} heet U welkom!"`.

#### Pluralization
If the interpolated variable is `count`, then it will be a number, and you might want to provide different strings based on the number to account for **pluralization**. For example, `"You have {{count}} new messages"`.

You use the `_one`, `_other`, `_zero`, `_two`, `_few`, `_many`, and `_other` suffixes to indicate the plural form of the string. For example, in the JSON file:

```json
"t_new_messages_zero": "You have no new messages 🥺",
"t_new_messages_one": "You have {{count}} new message",
"t_new_messages_other": "You have {{count}} new messages"
```





## How to contribute

Initial setup:
1. Fork the Pluto.jl repository
2. Clone your fork, we recommend GitHub Desktop. Let's say that you cloned it to `~/Desktop/Pluto.jl`
3. Create a new branch for your contribution

How to contribute:
4. Run `julia update_languages.jl` to synchonize the JSON files with the English file. This will add new keys to the JSON files as empty strings, which you can then fill in.
4. You can **edit the JSON files in this directory** to add translations. 🌟
5. When you are done, commit, push, and submit a pull request to the main Pluto.jl repository.



To see your translations in action while you are working on them:
1. In Julia, run `] dev ~/Desktop/Pluto.jl`. You now added your local copy of Pluto as a development package to your global Pkg environment. _(When you are done, you can run `] add Pluto` to go back to the normal Pluto installation.)_
2. Start Pluto as usual. It should say `"It looks like your are developing the Pluto package, using the unbundled frontend."` in the terminal.
3. Every time that you refresh the Pluto window, it will use your new translations!


### Tips for writing translations
Here is some advice for writing good translations:
- Open `english.json` and your target language JSON file side by side, so you can see the original text and your translation at the same time.
- If you want to see where a translation is used, you can search for the key in the Pluto codebase. This shows the place in our code where it is used. Don't try to understand the code, just try to figure out where it is used in the Pluto frontend.
- If you are not sure about a translation, you can ask the Pluto developers for help.
- Microsoft provides a repository with translation strings from their products: https://learn.microsoft.com/en-us/globalization/reference/microsoft-language-resources?utm_source=chatgpt.com#ui-strings

### New languages
If you want to contribute a new language/dialect that does not yet have a JSON file, then go for it! The Pluto developers are happy to set this up for you, but you can also try it yourself. Take a look at how "nederlands" (`nl`) is set up, and copy the structure.

Your language might require additional support, like Right-To-Left or other typography features. Again, the Pluto developers are more than happy to work together with you to make this happen!
