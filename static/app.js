const fileInput = document.querySelector('#cv-file');
const uploadZone = document.querySelector('#upload-zone');
const fileChip = document.querySelector('#file-chip');
const fileName = document.querySelector('#file-name');
const form = document.querySelector('#review-form');
const submitButton = document.querySelector('#submit-button');
const loadingState = document.querySelector('#loading-state');
const formError = document.querySelector('#form-error');
let selectedFile = null;

function chooseFile(file) {
  if (!file) return;
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const extensionIsValid = /\.(pdf|docx)$/i.test(file.name);
  if ((!allowedTypes.includes(file.type) && !extensionIsValid) || file.size > 10 * 1024 * 1024) {
    formError.textContent = file.size > 10 * 1024 * 1024 ? 'That file is over 10 MB. Please choose a smaller CV.' : 'Please choose a PDF or DOCX file.';
    formError.hidden = false;
    return;
  }
  formError.hidden = true;
  selectedFile = file;
  fileName.textContent = file.name;
  fileChip.hidden = false;
  uploadZone.classList.add('has-file');
  uploadZone.querySelector('.upload-icon').hidden = true;
  uploadZone.querySelector('.upload-copy').hidden = true;
}

uploadZone.addEventListener('click', (event) => {
  if (event.target.closest('#remove-file')) return;
  if (!selectedFile) fileInput.click();
});
uploadZone.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !selectedFile) {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', () => chooseFile(fileInput.files[0]));
document.querySelector('#remove-file').addEventListener('click', (event) => {
  event.stopPropagation();
  selectedFile = null;
  fileInput.value = '';
  fileChip.hidden = true;
  uploadZone.querySelector('.upload-icon').hidden = false;
  uploadZone.querySelector('.upload-copy').hidden = false;
});
for (const eventName of ['dragenter', 'dragover']) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.add('dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadZone.classList.remove('dragging');
  });
}
uploadZone.addEventListener('drop', (event) => chooseFile(event.dataTransfer.files[0]));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;
  if (!selectedFile) {
    formError.textContent = 'Add your CV first — the red pen needs something to work with.';
    formError.hidden = false;
    return;
  }
  const data = new FormData();
  data.append('cv', selectedFile);
  data.append('dream_role', form.elements.dream_role.value.trim());
  submitButton.disabled = true;
  loadingState.hidden = false;
  try {
    const response = await fetch('/api/review', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'We couldn’t review that CV just yet.');
    sessionStorage.setItem('cvReview', JSON.stringify(result));
    window.location.href = '/results';
  } catch (error) {
    formError.textContent = error.message || 'Something went wrong. Please try again.';
    formError.hidden = false;
    submitButton.disabled = false;
    loadingState.hidden = true;
  }
});
