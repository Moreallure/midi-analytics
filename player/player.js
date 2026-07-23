const notesDisplay = document.getElementById("notes");
const keyDisplay = document.getElementById("key");
const pedalDisplay = document.getElementById("pedal");

// MIDI note number for A0 (lowest piano key). Piano keys span MIDI 21 (A0) .. 108 (C8).
const MIDI_A0 = 21
// Offset converting a MIDI note number into a 1-based piano-key index (1..88).
const DATA_OFFSET = MIDI_A0 - 1

let data = []

const keyNames = [
    "A0", "A#0\nBb0", "B0",
    "C1", "C#1\nDb1", "D1", "D#1\nEb1", "E1",
    "F1", "F#1\nGb1", "G1", "G#1\nAb1",
    "A1", "A#1\nBb1", "B1",
    "C2", "C#2\nDb2", "D2", "D#2\nEb2", "E2",
    "F2", "F#2\nGb2", "G2", "G#2\nAb2",
    "A2", "A#2\nBb2", "B2",
    "C3", "C#3\nDb3", "D3", "D#3\nEb3", "E3",
    "F3", "F#3\nGb3", "G3", "G#3\nAb3",
    "A3", "A#3\nBb3", "B3",
    "C4", "C#4\nDb4", "D4", "D#4\nEb4", "E4",
    "F4", "F#4\nGb4", "G4", "G#4\nAb4",
    "A4", "A#4\nBb4", "B4",
    "C5", "C#5\nDb5", "D5", "D#5\nEb5", "E5",
    "F5", "F#5\nGb5", "G5", "G#5\nAb5",
    "A5", "A#5\nBb5", "B5",
    "C6", "C#6\nDb6", "D6", "D#6\nEb6", "E6",
    "F6", "F#6\nGb6", "G6", "G#6\nAb6",
    "A6", "A#6\nBb6", "B6",
    "C7", "C#7\nDb7", "D7", "D#7\nEb7", "E7",
    "F7", "F#7\nGb7", "G7", "G#7\nAb7",
    "A7", "A#7\nBb7", "B7",
    "C8"
];

function initData() {

    for (let index = 1; index < 89; index++) {

        let color;

        if ([0, 2, 5, 7, 10].indexOf(index % 12) == -1) {
            color = "#ebebeb"
        } else {
            color = "#262626"
        }

        data[index] = {
            value: 0,
            name: index*2,
            itemStyle: {
                color: color
            }
        }

    }

    update()

}

function update() {

    myChart.setOption({
        series: [
            {
                data: Object.values(data)
            }
        ]
    });

    let total = 0

    data.forEach(i => total += i.value)

    notesDisplay.textContent = total

    lastNote = new Date()

}

function formatTime(milliseconds) {
    if (milliseconds < 60000) {
        return parseFloat((milliseconds / 1000).toFixed(0)) + "s";
    } else if (milliseconds < 3600000) {
        return parseFloat((milliseconds / 60000).toFixed(1)) + "m";
    } else {
        return parseFloat((milliseconds / 3600000).toFixed(2)) + "h";
    }
}

const myChart = echarts.init(document.getElementById("chart"), null, {
    renderer: "canvas",
    useDirtyRect: false
});

myChart.setOption({
    xAxis: {
        type: "category",
        data: keyNames
    },
    yAxis: {
        type: "value"
    },
    // toolbox: {
    //     feature: {
    //         saveAsImage: {
    //             pixelRatio: 5
    //         }
    //     }
    // },
    tooltip: {},
    series: [
        {
            data: Object.values(data),
            type: "bar",
            animation: true,
            animationDuration: 50,
            animationDelayUpdate: 0
        }
    ],
    dataZoom: [
        {
            type: "inside"
        }
    ],
    animationDurationUpdate: 300
})

window.addEventListener("resize", myChart.resize);

initData()

const musicName = "la-campanella"

MIDI.Player.loadFile(`music/${musicName}.mid`, () => {

    layui.layer.msg(`${musicName}.mid loaded, click anywhere to start`)

});

MIDI.Player.addListener((event) => {

    if (event.velocity == 0) return

    const note = event.note

    data[note - DATA_OFFSET].value += 1

    keyDisplay.textContent = keyNames[note - DATA_OFFSET - 1].split("\n")[0]

    update()

});

document.body.addEventListener("click", () => {

    if (MIDI.Player.playing) return;

    MIDI.Player.start();

})