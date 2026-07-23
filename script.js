const saveRate = 10

// MIDI note number for A0 (lowest piano key). Piano keys span MIDI 21 (A0) .. 108 (C8).
const MIDI_A0 = 21
// Offset converting a MIDI note number into a 1-based piano-key index (1..88).
const DATA_OFFSET = MIDI_A0 - 1

// ponytail: chart colors live in CSS vars so the theme toggle restyles the canvas too.
function chartColors() {
    const s = getComputedStyle(document.documentElement)
    const v = (n) => s.getPropertyValue(n).trim()
    return {
        barWhite: v("--bar-white"),
        barBlack: v("--bar-black"),
        axisLine: v("--chart-axis-line"),
        axisLabel: v("--chart-axis-label"),
        split: v("--chart-split"),
        tooltipBg: v("--tooltip-bg"),
        tooltipBorder: v("--tooltip-border"),
        tooltipText: v("--tooltip-text"),
        tooltipAccent: v("--tooltip-accent")
    }
}

let data = []

let lastNote

let midiAccess

const notesDisplay = document.getElementById("notes");
const keyDisplay = document.getElementById("key");
const pedalDisplay = document.getElementById("pedal");

const toastEl = document.getElementById("toast");
let toastTimer
function showToast(message) {
    toastEl.textContent = message
    toastEl.classList.add("show")
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500)
}

let fullData = JSON.parse(localStorage.getItem("notes")) || { Total: [], Monthly: [], Daily: [], Temporarily: [] }

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

    const c = chartColors()

    for (let index = 1; index < 89; index++) {

        const isBlackKey = [0, 2, 5, 7, 10].includes(index % 12)

        data[index] = {
            value: fullData[displayingData][index] || 0,
            itemStyle: { color: isBlackKey ? c.barBlack : c.barWhite }
        }

    }

    update()
    updateInfo()

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

    let total = 0

    data.forEach(i => total += i.value)

    notesDisplay.textContent = total

    lastNote = new Date()

}

navigator.requestMIDIAccess({sysex:false}).then(success, () => {showToast("Failed")});

function success(access) {

    midiAccess = access;

    midiAccess.onstatechange = function(event) {

        const port = event.port;

        if (port.state == "connected") {

            showToast(`MIDI device "${port.name}" connected!`)

            document.querySelector("#bad").style.display = "none"
            document.querySelector("#good").style.display = "flex"
            document.querySelector("#good p").textContent = `"${port.name}" Connected`

        }

        if (port.type == "input") {

            port.onmidimessage = function (event) {

                if (event.data[0] !== 144 || event.data[2] == 0) return;

                const note = event.data[1] - DATA_OFFSET;

                if (recordingData.includes(displayingData) || displayingData == "Temporarily") {

                    data[note].value ++

                }

                for (const type of recordingData) {

                    if (!fullData[type][note]) fullData[type][note] = 0

                    fullData[type][note] ++

                }

                update()

                keyDisplay.textContent = keyNames[note-1]

            };

        }

    };
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

    const now = new Date()

    if (fullData.Daily[0] && new Date(fullData.Daily[0].date).getDay() !== now.getDay()) {
        fullData.Daily = []
        updateDate()
        initData()
    }

    if (fullData.Monthly[0] && new Date(fullData.Monthly[0].date).getMonth() !== now.getMonth()) {
        fullData.Monthly = []
        updateDate()
        initData()
    }

}

function updateDate() {

    for (const type of recordingData) {

        if (!fullData[type][0]) {
            fullData[type][0] = { pedal: 0, date: 0 }
        }

        fullData[type][0].date = new Date().getTime()

    }

    save()

}

function save() {

    localStorage.setItem("notes", JSON.stringify(fullData))

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

function chartAxisOption() {
    const c = chartColors()
    return {
        xAxis: {
            type: "category",
            data: keyNames,
            axisLine: { lineStyle: { color: c.axisLine } },
            axisTick: { show: false },
            axisLabel: { color: c.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono, monospace", interval: 0 }
        },
        yAxis: {
            type: "value",
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: c.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
            splitLine: { lineStyle: { color: c.split } }
        },
        tooltip: {
            backgroundColor: c.tooltipBg,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            textStyle: { color: c.tooltipText, fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
            formatter: (params) => `${params.name.replace(/\n/g, " / ")}<br/><span style="color:${c.tooltipAccent}">${params.value}</span> hits`
        }
    }
}

myChart.setOption({
    ...chartAxisOption(),
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
    grid: {
        left: 48,
        right: 24,
        top: 24,
        bottom: 48
    },
    animationDurationUpdate: 300
})

window.addEventListener("resize", myChart.resize);

document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = next
    localStorage.setItem("theme", next)
    myChart.setOption(chartAxisOption())
    initData()
})

if (localStorage.getItem("selected")) {
    document.querySelector(`option[value="${localStorage.getItem("selected")}"]`).selected = true
    displayingData = localStorage.getItem("selected")
}

initData()
checkDate()

document.querySelectorAll("#record-tags input[type=checkbox]").forEach((box) => {

    box.addEventListener("change", () => {

        if (box.checked) {

            recordingData.push(box.value)

        } else {

            recordingData = recordingData.filter((item) => {
                return item !== box.value;
            });

        }

    })

})

document.querySelectorAll(".check-group input[type=checkbox]").forEach((box) => {

    const stat = document.querySelector(`.stat[data-stat="${box.value}"]`)
    const apply = () => {
        stat.style.display = box.checked ? "" : "none"
        requestAnimationFrame(() => myChart.resize())
    }
    box.addEventListener("change", apply)
    apply()

})

document.getElementById("display-select").addEventListener("change", (event) => {

    autoSave()

    displayingData = event.target.value

    initData()

    localStorage.setItem("selected", event.target.value)

});

document.querySelector(".delete").addEventListener("click", () => {

    fullData = { Total: [], Monthly: [], Daily: [], Temporarily: [] }

    initData()

})

const modalEl = document.getElementById("modal")
const modalFrame = document.getElementById("modal-frame")

function closeModal() {
    modalEl.classList.remove("show")
    modalEl.setAttribute("aria-hidden", "true")
    modalFrame.src = ""
}

document.getElementById("help").addEventListener("click", () => {

    modalFrame.src = `/help.html`
    modalEl.classList.add("show")
    modalEl.setAttribute("aria-hidden", "false")

})

modalEl.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal)
})

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && modalEl.classList.contains("show")) closeModal()

})