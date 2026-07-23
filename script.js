const saveRate = 10

let count = 0
let data = []

let lastNote
let lastPedal

const notesDisplay = document.getElementById("notes");
const keyDisplay = document.getElementById("key");
const pedalDisplay = document.getElementById("pedal");

let fullData = JSON.parse(localStorage.getItem("notes")) || { Total: [], Monthly: [], Daily: [], Temporarily: [], Custom: [] }
// fullData = { Total: [], Monthly: [], Daily: [] }

let displayingData = "Total"
let recordingData = ["Total", "Monthly", "Daily"]

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

    const type = displayingData

    for (let index = 1; index < 89; index++) {

        let color;

        if ([0, 2, 5, 7, 10].indexOf(index % 12) == -1) {
            color = "#ebebeb"
        } else {
            color = "#262626"
        }

        data[index] = {
            value: fullData[type][index] || 0,
            name: index*2,
            itemStyle: {
                color: color
            }
        }

    }

    update()

    updateInfo

}

function updateInfo () {

    pedalDisplay.textContent = formatTime(fullData[displayingData][0] && fullData[displayingData][0].pedal)

}

function update() {

    myChart.setOption({
        series: [
            {
                data: Object.values(data)
            }
        ]
    });

    total = 0

    data.map(i => total += i.value)

    notesDisplay.textContent = total

    lastNote = new Date()

}

function initMidi() {

    const device = WebMidi.inputs[0];

    if (!device) {

        // layui.layer.msg("No MIDI connection found! Refresh the page to try again.")

        document.querySelector("#bad").style.display = "flex"

        return

    } else {

        // layui.layer.msg(`MIDI device "${WebMidi.inputs[0].name}" connected!`)

        document.querySelector("#good").style.display = "flex"

        document.querySelector("#good p").textContent = `"${WebMidi.inputs[0].name}" Connected`

    }

    device.addListener("noteon", event => {

        const note = keyNames.findIndex(i => i.includes(event.note.identifier)) + 1;

        if (recordingData.includes(displayingData) || displayingData == "Temporarily") {

            data[note].value ++

        }

        for (type of recordingData) {

            if (!fullData[type][note]) fullData[type][note] = 0

            fullData[type][note] ++

        }

        update()

        keyDisplay.textContent = event.note.identifier

    })

    device.addListener("controlchange", event => {

        if (event.value) {

            lastPedal = new Date()

        } else {

            for (type of recordingData) {

                if (!fullData[type][0]) {
                    fullData[type][0] = { pedal: 0, date: 0 }
                }

                fullData[type][0].pedal += (new Date() - lastPedal)

            }

            updateInfo()

        }

        lastNote = new Date()

    })

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

function checkDate() {

    if (!fullData.Daily[0]) return

    const now = new Date()

    if (new Date(fullData.Daily[0].date).getDay() !== now.getDay()) {
        fullData.Daily = []
        updateDate()
        initData()
    }

    if (new Date(fullData.Monthly[0].date).getMonth() !== now.getMonth()) {
        fullData.Monthly = []
        updateDate()
        initData()
    }

}

function updateDate() {

    for (type of recordingData) {

        if (!fullData[type][0]) {
            fullData[type][0] = { pedal: 0, date: 0 }
        }

        fullData[type][0].date = new Date().getTime()

    }

    save()

}

function save() {

    localStorage.setItem("notes", JSON.stringify(fullData))

    console.log("SAVED!")

    // layui.layer.msg("AUTOSAVED!")

}

function autoSave() {

    const time = new Date() - lastNote

    if (saveRate > time && time > saveRate / 6) {

        updateDate()

    }

    if (time > 6000) {

        if (displayingData == "Temporarily") {
            initData()
            update()
        }

    }

}

setInterval(autoSave, saveRate);

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

WebMidi
    .enable()
    .then(initMidi)
    .catch(err => alert(err));

if (localStorage.getItem("selected")) {
    document.querySelector(`option[value="${localStorage.getItem("selected")}"]`).selected = true
    displayingData = localStorage.getItem("selected")
}

initData()
checkDate()

layui.use(() => {

    const form = layui.form;

    const layer = layui.layer

    form.on('checkbox()', (data) => {

        if (data.elem.checked) {

            recordingData.push(data.elem.title)

        } else {

            recordingData = recordingData.filter((item) => {
                return item !== data.elem.title;
            });

        }

    })


    form.on('select()', (data) => {

        autoSave()

        displayingData = data.value

        initData()

        // layer.msg("Displaying Dataset: " + displayingData)

        localStorage.setItem("selected", data.value)

    });

    document.querySelector(".layui-btn").addEventListener("click", () => {

        if (window.confirm(`Are you sure you want to delete all the data?`)) {

            // fullData[displayingData] = []

            fullData = { Total: [], Monthly: [], Daily: [], Temporarily: [], Custom: [] }

            initData()

        }

    })

})

document.getElementById("help").addEventListener("click", () => {

    layui.layer.open({
        type: 2,
        area: ['900px', '600px'],
        shadeClose: true,
        content: `/help.html`,
        title: "Help"
    });

})