// source of audio asset: https://notificationsounds.com/about
export async function makeSound() {
  try {
    const audioContext = new AudioContext();
    const buffer = await (
      await fetch("/the-little-dwarf-498.ogg")
    ).arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const audioBufferSourceNode = audioContext.createBufferSource();
    audioBufferSourceNode.buffer = audioBuffer;
    audioBufferSourceNode.connect(audioContext.destination);
    audioBufferSourceNode.start();
  } catch (error) {
    console.warn(error);
  }
}

export async function notify(which: string) {
  let title = "Pomodoro";
  let body = "";

  // eslint-disable-next-line default-case
  switch (which) {
    case "pomo":
      body = "Time to focus";
      break;
    case "shortBreak":
      body = "Time to take a short break";
      break;
    case "longBreak":
      body = "Time to take a long break";
      break;
    case "nextCycle":
      body = "Time to do the next cycle of pomos";
      break;
    case "cyclesCompleted":
      body = "All cycles of focus durations are done";
      break;
  }

  let options = {
    body,
    silent: true,
  };

  await makeSound();

  let noti = new Notification(title, options);

  noti.addEventListener("click", (ev) => {
    noti.close();
    window.focus();
  });

  setTimeout(() => {
    noti.close();
  }, 5000);
}
