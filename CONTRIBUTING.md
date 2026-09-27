# Contributing

This is a single-file browser-console script that drives YouTube Studio's live UI, so there is
no automated test suite. Before opening a pull request:

1. Test your change against a real Studio account (a throwaway channel with a couple of test
   drafts is enough) in both modes your change could affect.
2. Note in the PR description: which `MODE` you tested, roughly how many drafts/playlist items,
   and the date (YouTube Studio's markup changes without notice, so dated confirmation matters
   more here than in most projects).

Selector fixes for a Studio UI change YouTube has shipped are the most common and most welcome
kind of change — see [README.md § Limitations](README.md#limitations-and-failure-modes) for how
those failures usually show up (a silent timeout, not a thrown error).

This is a fork of [Niedzwiedzw/youtube-publish-drafts](https://github.com/Niedzwiedzw/youtube-publish-drafts);
a fix that is not specific to this fork's changes may be more useful contributed upstream too.
