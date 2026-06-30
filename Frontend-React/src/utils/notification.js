export const requestNotificationPermission=()=>{

    if("Notification" in window){

        Notification.requestPermission();

    }

};

export const showNotification=(title,body)=>{
    // 1. Show UI Toast (Legacy Parity)
    const toastElem = document.getElementById("toast");
    if (toastElem) {
        toastElem.innerText = `${title}: ${body}`;
        toastElem.style.transform = "translateX(0)";
        setTimeout(() => {
            toastElem.style.transform = "translateX(120%)";
        }, 3000);
    }

    // 2. Browser Push Notification (Fallback/Extra)
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body
        });
    }
}