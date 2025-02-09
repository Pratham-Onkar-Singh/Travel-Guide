VANTA.GLOBE({
    el: "body",
    mouseControls: false,
    touchControls: false,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    color: 0x22d3ee,
    backgroundColor: 0x0
});


const travelButt = document.querySelector(".go");

travelButt.addEventListener("click", () => {
    console.log("travelled");
    window.location.href = "main.html";
});


