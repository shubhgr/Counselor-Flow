function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('counselor-testimonial-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('videos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveTestimonialVideo(file) {
  const db = await database();
  const id = `media:${crypto.randomUUID()}`;
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      tx.objectStore('videos').put(file, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return id;
  } finally {
    db.close();
  }
}
export async function loadTestimonialVideo(id) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('videos').objectStore('videos').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
