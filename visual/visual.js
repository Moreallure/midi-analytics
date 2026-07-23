function initMidi() {

    const device = WebMidi.inputs[0];

    if (!device) return

    device.addListener("noteon", event => {

        console.log(event.note)

    })

    device.addListener("controlchange", event => {

        console.log(event)

    })

}

WebMidi
    .enable()
    .then(initMidi)
    .catch(err => alert(err));

let note = document.createElement("div")

note.className = "note"

note.style.height = "20px"
note.style.width = "20px"

document.body.appendChild(note)

anime({
    targets: note,
    height: 270,
    delay: 100
});