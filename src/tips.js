// Text for the first-run tips (src/components/Tips.jsx), per screen, in the order they show.
// `target` matches a data-tour="…" attribute on that screen. Edit wording freely; changing an `id`
// makes that tip show again for everyone.

export const TIPS = {
  home: [
    { id: 'home-new', target: 'new-show', title: 'Start a new show',
      body: 'Name the show, add your followspots and load each spot\'s color frames. You can change all of it later.' },
    { id: 'home-import', target: 'import-show', title: 'Open a shared show',
      body: 'Got a .spotplot file from your team? Import it here, or double-click the file in Finder.' },
    { id: 'home-card', target: 'show-card', title: 'Your shows',
      body: 'Click a show to open it.' },
  ],
  newShow: [
    { id: 'new-spot', target: 'spot-setup', title: 'Load each spot\'s colors',
      body: 'Type a gel number or name in each frame to search the catalog. Tick Permanent color below for a gel that never leaves the fixture.' },
    { id: 'new-copy', target: 'copy-colors', title: 'Same colors on every spot?',
      body: 'Copy all the color frames from another spot instead of typing them again.' },
    { id: 'new-save', target: 'save-show', title: 'Save when you\'re ready',
      body: 'Only the show title is required.' },
  ],
  dashboard: [
    { id: 'dash-nav', target: 'show-nav', title: 'Everything for this show',
      body: 'Build the show from here: the cue list, scenes, characters and spot notes. Print makes the paperwork.' },
    { id: 'dash-settings', target: 'show-settings', title: 'Show Settings',
      body: 'Change spots, operators, color frames, iris sizes and custom actions, and choose which cue details show on the cue list and on prints.' },
    { id: 'dash-export', target: 'export-show', title: 'Back up and share',
      body: 'Export saves the whole show, photos and logo included, as one .spotplot file you can send to anyone with SpotPlot.' },
    { id: 'dash-cues', target: 'open-cues', title: 'Open the cue list',
      body: 'This is where you\'ll spend most of your time.' },
  ],
  cueList: [
    { id: 'cue-first', target: 'first-cue', title: 'Add your first cue',
      body: 'Each row of the cue list is one light cue, with a column for every spot.' },
    { id: 'cue-lq', target: 'cue-lq', title: 'One row per light cue',
      body: 'Click the number to type the LQ. The menu under it sets the scene. Press Cmd+= to add a cue.' },
    { id: 'cue-action', target: 'cue-action', title: 'What the spot does',
      body: 'Pick an action like Pick Up, Fade Out or Off, then the character. Off means the spot isn\'t used in that cue.' },
    { id: 'cue-look', target: 'cue-look', title: 'Iris and color',
      body: 'Pick the iris size, then click the color frames to use. Two frames on reads as F1+F2. NC means no color.' },
    { id: 'cue-wlq', target: 'cue-wlq', title: 'w/LQ',
      body: 'Turn this on and the When line reads "w/ LQ" with this cue\'s number. It stays linked if you renumber the cue.' },
    { id: 'cue-cell', target: 'cue-cell', title: 'Do more with a cue',
      body: 'Double-click a cue for highlights and spot notes. Drag one cue onto another to copy it, or right-click it to clear it. In When and Notes, Cmd+B, I and U format the text.' },
    { id: 'cue-add', target: 'add-cue-end', title: 'Adding cues',
      body: 'Add a cue at the end here, or hover between two cues to insert one.' },
    { id: 'cue-scene', target: 'add-scene', title: 'Scenes and characters',
      body: 'Add a scene or character without leaving the cue list. Scenes become the green headers here and on your prints.' },
  ],
  print: [
    { id: 'print-pick', target: 'print-items', title: 'Pick a sheet',
      body: 'Spot sheets for each operator, the caller sheet, the color load, spot notes and a characters sheet.' },
    { id: 'print-options', target: 'print-label', title: 'Label and options',
      body: 'Add a label like "2-24 Dress Run" for the page header. Every option updates the preview right away.' },
    { id: 'print-preview', target: 'print-preview', title: 'What you see is what prints',
      body: 'This is the real PDF, page breaks and all.' },
    { id: 'print-export', target: 'print-export', title: 'Export PDF',
      body: 'Saves exactly what the preview shows.' },
  ],
  characters: [
    { id: 'chars-add', target: 'add-character', title: 'Add the cast',
      body: 'Characters fill the character picker in the cue list. Add a photo and costume notes so operators know who to pick up.' },
  ],
  scenes: [
    { id: 'scenes-add', target: 'add-scene-form', title: 'Scenes in show order',
      body: 'Add each scene with its song. Reorder them with the arrows. They show as headers in the cue list and on prints.' },
  ],
  spotNotes: [
    { id: 'notes-about', target: 'spot-notes', title: 'Notes for operators',
      body: 'Double-click a cue in the cue list to write a spot note. Check notes off once you\'ve given them, and print them from Print.' },
  ],
};
