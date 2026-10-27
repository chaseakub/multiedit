async function activate(tab) {
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Open Multiedit' });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#e2231a' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Multiedit cannot open on this page. Try a regular website.' });
  }
}

chrome.action.onClicked.addListener(activate);
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-multiedit') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await activate(tab);
});
