# Sacred Stops: A Temple Travel Journal

A personal travel journal of the temples I've visited and hope to visit, with stories and reflections from each visit.

**Live site:** https://kaeclayton.github.io/sacred-stops/

> This site started as a project for a web development course with BYU-Pathway Worldwide. I've since enhanced it to showcase more skills, including the items under Technical highlights.

## Features

- **Temple gallery** of temples I've visited, with cards that flip to show details like location and dedication date
- **Future visits** wish list of temples I hope to see
- **Stories** in a responsive grid, labeled by temple, with a temple filter and a "Load more" button
- **Share your story form,** where visitors can add their own temple experiences, saved in their browser
- **Homepage** with live counts and a featured story that rotates daily, shown with that temple's photo

## Technical highlights

- **Data-driven pages.** Temples and stories load from JSON files, so stats, filters, and the featured story stay accurate as content is added.
- **Safe handling of visitor input.** Story cards are built with `textContent` rather than `innerHTML`, so text visitors submit can never run as code.
- **Reliable dates across time zones.** Dates are parsed as local time, so they display correctly for visitors anywhere.
- **Deep linking.** A "Read Full Story" link opens the Stories page filtered to that temple, scrolled to the story, and highlighted.
- **Responsive and accessible.** Layouts adapt from phones to large screens without horizontal scrolling, with keyboard-accessible cards, labeled form fields, and a logical heading structure.

## Built with

- HTML, CSS (Grid, Flexbox, media queries), and JavaScript
- localStorage for visitor-submitted stories
- GitHub Pages