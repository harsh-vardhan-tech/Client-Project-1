'use strict';

(function () {
   const STORAGE_KEY = 'hearthside_bookstore_events';

   let events = [];
   let searchTerm = '';
  let toastTimer = null;
   let pendingDeleteEvent = null;

  const headerDate = document.getElementById('header-date');
   const searchForm = document.getElementById('search-form');
   const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
   const toggleAddEventBtn = document.getElementById('toggle-add-event');
   const addEventSection = document.getElementById('add-event-section');
  const formHeading = document.getElementById('form-heading');
   const eventIdInput = document.getElementById('event-id');
   const cancelAddEventBtn = document.getElementById('cancel-add-event');
  const eventForm = document.getElementById('event-form');
   const saveEventBtn = document.getElementById('save-event-btn');
   const loadingIndicator = document.getElementById('loading-indicator');
  const loadingText = document.getElementById('loading-text');
   const emptyState = document.getElementById('empty-state');
   const eventsList = document.getElementById('events-list');
  const eventsCount = document.getElementById('events-count');
   const toast = document.getElementById('toast');

  const categorySelect = document.getElementById('event-category');
   const otherCategoryWrap = document.getElementById('other-category-wrap');
   const otherCategoryInput = document.getElementById('event-other-category');

   const confirmModal = document.getElementById('confirm-modal');
   const confirmModalText = document.getElementById('confirm-modal-text');
  const confirmModalYes = document.getElementById('confirm-modal-yes');
   const confirmModalNo = document.getElementById('confirm-modal-no');
   const confirmModalClose = document.getElementById('confirm-modal-close');

   const FIELD_IDS = ['title', 'category', 'other-category', 'location', 'date', 'time', 'capacity', 'description'];

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
   const UNESCAPES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

  function sanitize(input) {
   if (!input) return '';
    return String(input).trim().replace(/[&<>"']/g, function (ch) {
      return ESCAPES[ch];
    });
   }

   function unescapeText(text) {
    if (!text) return '';
   let result = String(text);
    let previous;
     do {
      previous = result;
       result = result.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, function (entity) {
         return UNESCAPES[entity];
      });
    } while (result !== previous && /&amp;|&lt;|&gt;|&quot;|&#39;/.test(result));
   return result;
  }

   function normalizeEvent(evt) {
   return {
       id: evt.id,
     title: sanitize(unescapeText(evt.title)),
      category: sanitize(unescapeText(evt.category)),
       location: sanitize(unescapeText(evt.location || 'Main Reading Hall')),
     date: evt.date,
      time: evt.time,
       capacity: evt.capacity ? Number(evt.capacity) : null,
     description: sanitize(unescapeText(evt.description))
    };
   }

  function logAnalytics() {
    console.log('[Analytics] User interacted with Independent Bookstore Events Page');
   }

   function showToast(message) {
    toast.textContent = message;
     toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
   toastTimer = window.setTimeout(function () {
      toast.hidden = true;
     }, 3200);
   }

   function formatDate(dateStr) {
     const parts = dateStr.split('-');
    const year = Number(parts[0]);
   const month = Number(parts[1]);
    const day = Number(parts[2]);
     const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
   }

   function formatTime(timeStr) {
    const parts = timeStr.split(':');
   const hour = Number(parts[0]);
    const minute = Number(parts[1]);
     const d = new Date();
    d.setHours(hour, minute);
   return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
   }

   function addDays(n) {
   const d = new Date();
    d.setDate(d.getDate() + n);
     return d.toISOString().slice(0, 10);
   }

   function simulateRequest(ms) {
     return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
   });
   }

   async function runAsync(message, work) {
   loadingText.textContent = message;
    loadingIndicator.hidden = false;
     try {
     return await work();
   } finally {
       loadingIndicator.hidden = true;
     }
  }

   function getStoredEvents() {
     try {
       const data = localStorage.getItem(STORAGE_KEY);
     if (data) {
         const parsed = JSON.parse(data);
       if (Array.isArray(parsed) && parsed.length > 0) {
           return parsed.map(normalizeEvent);
       }
       }
     } catch {
      return null;
   }
    return null;
  }

   function saveEventsToStorage(items) {
    try {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
   }
   }

  function fetchInitialEvents() {
   const cached = getStoredEvents();
    if (cached) {
      return new Promise(function (resolve) {
         window.setTimeout(function () {
         resolve(cached);
         }, 350);
       });
    }

    const seedEvents = [
     {
         id: 'seed-1',
       title: 'Local Mystery Writers Night',
         category: 'Author Reading',
       location: 'Main Reading Hall',
         date: addDays(3),
       time: '18:30',
         capacity: 40,
       description: 'Three local crime authors share excerpts from their new thrillers, followed by an audience Q&A session.'
     },
      {
         id: 'seed-2',
       title: 'Tuesday Morning Book Club',
         category: 'Book Club',
       location: 'Café Corner',
         date: addDays(6),
       time: '10:00',
         capacity: 15,
       description: 'Monthly discussion covering contemporary fiction titles over coffee in the reading nook.'
      },
       {
         id: 'seed-3',
       title: 'Saturday Kids Story Time',
         category: 'Story Time',
       location: 'Kids Corner',
         date: addDays(9),
       time: '11:00',
         capacity: 25,
       description: 'Interactive picture-book reading, rhyming songs, and coloring crafts for children ages 3 to 7.'
       }
   ];

     saveEventsToStorage(seedEvents);

   return new Promise(function (resolve) {
       window.setTimeout(function () {
       resolve(seedEvents);
      }, 500);
   });
   }

   function getFilteredEvents() {
   if (!searchTerm) return events;
    const term = unescapeText(searchTerm).toLowerCase();
     return events.filter(function (evt) {
     return (
       unescapeText(evt.title).toLowerCase().includes(term) ||
         unescapeText(evt.category).toLowerCase().includes(term) ||
       unescapeText(evt.location).toLowerCase().includes(term) ||
         unescapeText(evt.description).toLowerCase().includes(term)
       );
    });
  }

   function renderEvents() {
    const filtered = getFilteredEvents().slice().sort(function (a, b) {
       return (a.date + a.time).localeCompare(b.date + b.time);
    });

    eventsList.replaceChildren();

    if (filtered.length === 0) {
       emptyState.textContent = searchTerm
         ? 'No data found. Try a different search.'
       : 'No data found. Click "+ Add Event" to create the first event.';
       emptyState.hidden = false;
     eventsList.hidden = true;
    } else {
       emptyState.hidden = true;
     eventsList.hidden = false;
      filtered.forEach(function (evt) {
         eventsList.appendChild(buildEventCard(evt));
     });
    }

    eventsCount.textContent = filtered.length + ' event' + (filtered.length === 1 ? '' : 's') + ' shown';
  }

   function buildEventCard(evt) {
    const li = document.createElement('li');
     li.className = 'event-card';

   const headerRow = document.createElement('div');
    headerRow.className = 'event-card-header';

    const badgeWrap = document.createElement('div');
   badgeWrap.className = 'badge-wrap';

     const category = document.createElement('p');
    category.className = 'event-category';
   category.textContent = unescapeText(evt.category);
    badgeWrap.appendChild(category);

    const location = document.createElement('p');
   location.className = 'event-location';
    location.textContent = unescapeText(evt.location || 'Main Reading Hall');
     badgeWrap.appendChild(location);

   headerRow.appendChild(badgeWrap);

     const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';

    const editBtn = document.createElement('button');
     editBtn.type = 'button';
    editBtn.className = 'icon-action-btn';
   editBtn.setAttribute('aria-label', 'Edit ' + unescapeText(evt.title));
    editBtn.textContent = 'Edit';
     editBtn.addEventListener('click', function () {
      openEditEvent(evt);
   });
    cardActions.appendChild(editBtn);

    const removeBtn = document.createElement('button');
   removeBtn.type = 'button';
    removeBtn.className = 'icon-action-btn delete-action';
     removeBtn.setAttribute('aria-label', 'Delete ' + unescapeText(evt.title));
    removeBtn.textContent = '×';
   removeBtn.addEventListener('click', function () {
       openConfirmModal(evt);
     });
    cardActions.appendChild(removeBtn);

    headerRow.appendChild(cardActions);

    const title = document.createElement('h3');
   title.className = 'event-title';
    title.textContent = unescapeText(evt.title);

    const meta = document.createElement('p');
   meta.className = 'event-meta';
    meta.textContent = formatDate(evt.date) + ' at ' + formatTime(evt.time);

    const desc = document.createElement('p');
   desc.className = 'event-desc';
    desc.textContent = unescapeText(evt.description);

    li.appendChild(headerRow);
   li.appendChild(title);
    li.appendChild(meta);
     li.appendChild(desc);

   if (evt.capacity) {
       const cap = document.createElement('p');
     cap.className = 'event-capacity';
      cap.textContent = 'Max capacity: ' + evt.capacity + ' attendees';
       li.appendChild(cap);
    } else {
      const cap = document.createElement('p');
       cap.className = 'event-capacity';
     cap.textContent = 'Open seating';
      li.appendChild(cap);
     }

   return li;
   }

  function openConfirmModal(eventItem) {
   pendingDeleteEvent = eventItem;
    confirmModalText.textContent =
      'Are you sure you want to permanently remove "' + unescapeText(eventItem.title) + '" from the bookstore schedule?';
    confirmModal.hidden = false;
   confirmModalNo.focus();
  }

   function closeConfirmModal() {
   confirmModal.hidden = true;
    pendingDeleteEvent = null;
   }

   async function executeDeleteEvent() {
    if (!pendingDeleteEvent) return;
     const itemToDelete = pendingDeleteEvent;
    closeConfirmModal();

    await runAsync('Deleting event\u2026', function () {
       return simulateRequest(350);
    });

    events = events.filter(function (e) {
     return e.id !== itemToDelete.id;
    });
   saveEventsToStorage(events);
    renderEvents();
     showToast('Event removed from schedule.');
    logAnalytics();
   }

   function resetFormMode() {
    formHeading.textContent = 'New Event';
   saveEventBtn.textContent = 'Save Event';
    saveEventBtn.setAttribute('aria-label', 'Save Event');
     eventIdInput.value = '';
    eventForm.reset();
   otherCategoryWrap.hidden = true;
    otherCategoryInput.value = '';
     FIELD_IDS.forEach(clearFieldError);
   }

  function openEditEvent(item) {
     resetFormMode();
    formHeading.textContent = 'Edit Event';
   saveEventBtn.textContent = 'Update Event';
    saveEventBtn.setAttribute('aria-label', 'Update Event');
     eventIdInput.value = item.id;

   eventForm.elements.title.value = unescapeText(item.title);
    const standardCategories = ['Author Reading', 'Book Club', 'Story Time', 'Workshop', 'Open Mic'];
     const itemCat = unescapeText(item.category);
    if (standardCategories.includes(itemCat)) {
     eventForm.elements.category.value = itemCat;
      otherCategoryWrap.hidden = true;
       otherCategoryInput.value = '';
    } else {
      eventForm.elements.category.value = 'Other';
       otherCategoryWrap.hidden = false;
     otherCategoryInput.value = itemCat;
    }

    eventForm.elements.location.value = unescapeText(item.location || '');
     eventForm.elements.date.value = item.date;
    eventForm.elements.time.value = item.time;
   eventForm.elements.capacity.value = item.capacity || '';
    eventForm.elements.description.value = unescapeText(item.description);

    addEventSection.hidden = false;
   toggleAddEventBtn.setAttribute('aria-expanded', 'true');
    addEventSection.scrollIntoView({ behavior: 'smooth' });
     document.getElementById('event-title').focus();
  }

   function clearFieldError(field) {
     const input = document.getElementById('event-' + field);
    const errorEl = document.getElementById('event-' + field + '-error');
   if (input) {
      input.classList.remove('field-invalid');
       input.removeAttribute('aria-invalid');
    }
   if (errorEl) {
       errorEl.textContent = '';
     }
  }

   function setFieldError(field, message) {
     const input = document.getElementById('event-' + field);
    const errorEl = document.getElementById('event-' + field + '-error');
   if (input) {
      input.classList.add('field-invalid');
       input.setAttribute('aria-invalid', 'true');
    }
   if (errorEl) {
       errorEl.textContent = message;
     }
  }

   function validateForm(data) {
     const errors = {};

   if (!data.title) errors.title = 'Title is required.';
    if (!data.category) {
       errors.category = 'Choose a category.';
    } else if (data.category === 'Other') {
      if (!data.otherCategory || !data.otherCategory.trim()) {
         errors['other-category'] = 'Please specify the custom category.';
     }
    }

    if (!data.date) {
      errors.date = 'Date is required.';
    } else {
     const today = new Date();
      today.setHours(0, 0, 0, 0);
       const chosen = new Date(data.date + 'T00:00:00');
     if (chosen < today) {
       errors.date = 'Event date cannot be in the past.';
       }
     }

   if (!data.time) errors.time = 'Time is required.';
    if (!data.description) errors.description = 'Description is required.';

    if (data.capacity) {
     const n = Number(data.capacity);
      if (!Number.isInteger(n) || n < 1) {
       errors.capacity = 'Capacity must be a positive number (1 or more).';
     }
   }

     return errors;
  }

   async function handleFormSubmit(e) {
     e.preventDefault();

   FIELD_IDS.forEach(clearFieldError);

     const editId = eventIdInput.value;
    const formData = {
      title: eventForm.elements.title.value.trim(),
       category: eventForm.elements.category.value,
     otherCategory: otherCategoryInput.value.trim(),
      location: eventForm.elements.location.value.trim(),
       date: eventForm.elements.date.value,
     time: eventForm.elements.time.value,
      capacity: eventForm.elements.capacity.value.trim(),
       description: eventForm.elements.description.value.trim()
   };

     const errors = validateForm(formData);
    const errorFields = Object.keys(errors);

    if (errorFields.length > 0) {
     errorFields.forEach(function (field) {
         setFieldError(field, errors[field]);
       });
     const firstInvalid = document.getElementById('event-' + errorFields[0]);
      if (firstInvalid) firstInvalid.focus();
       return;
   }

     const resolvedCategory = formData.category === 'Other'
     ? formData.otherCategory
      : formData.category;

     saveEventBtn.disabled = true;
    eventForm.setAttribute('aria-busy', 'true');

    try {
      const loadingMsg = editId ? 'Updating event\u2026' : 'Saving event\u2026';
       await runAsync(loadingMsg, function () {
       return simulateRequest(450);
      });

     if (editId) {
       const existing = events.find(function (ev) {
           return ev.id === editId;
       });
         if (existing) {
         existing.title = sanitize(unescapeText(formData.title));
           existing.category = sanitize(unescapeText(resolvedCategory));
         existing.location = sanitize(unescapeText(formData.location)) || 'Main Reading Hall';
           existing.date = formData.date;
         existing.time = formData.time;
           existing.capacity = formData.capacity ? Number(formData.capacity) : null;
         existing.description = sanitize(unescapeText(formData.description));
         }
       showToast('Event updated successfully.');
       } else {
       const newEvent = {
           id: 'evt-' + Date.now(),
         title: sanitize(unescapeText(formData.title)),
           category: sanitize(unescapeText(resolvedCategory)),
         location: sanitize(unescapeText(formData.location)) || 'Main Reading Hall',
           date: formData.date,
         time: formData.time,
           capacity: formData.capacity ? Number(formData.capacity) : null,
         description: sanitize(unescapeText(formData.description))
         };
       events.push(newEvent);
         showToast('Event saved successfully.');
     }

       saveEventsToStorage(events);
     renderEvents();
      resetFormMode();
       addEventSection.hidden = true;
     toggleAddEventBtn.setAttribute('aria-expanded', 'false');
      logAnalytics();
     } finally {
     saveEventBtn.disabled = false;
      eventForm.removeAttribute('aria-busy');
    }
   }

   function handleSearchInput(e) {
    searchTerm = sanitize(e.target.value);
     clearSearchBtn.hidden = !searchTerm;
    renderEvents();
   }

   function handleClearSearch() {
    searchInput.value = '';
   searchTerm = '';
    clearSearchBtn.hidden = true;
     renderEvents();
    searchInput.focus();
   }

  function openAddSection() {
    resetFormMode();
   addEventSection.hidden = false;
    toggleAddEventBtn.setAttribute('aria-expanded', 'true');
     document.getElementById('event-title').focus();
   }

   function closeAddSection() {
     resetFormMode();
    addEventSection.hidden = true;
   toggleAddEventBtn.setAttribute('aria-expanded', 'false');
    toggleAddEventBtn.focus();
  }

   function toggleAddSection() {
    if (addEventSection.hidden) {
       openAddSection();
    } else {
      closeAddSection();
    }
   }

   async function init() {
    headerDate.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
       month: 'long',
     day: 'numeric'
    });

    const dateInput = document.getElementById('event-date');
   if (dateInput) {
       dateInput.min = addDays(0);
     }

   eventsList.hidden = true;
    emptyState.hidden = true;

    try {
     const fetched = await runAsync('Loading events\u2026', fetchInitialEvents);
      events = fetched.map(normalizeEvent);
     } catch {
     events = [];
   } finally {
       renderEvents();
     logAnalytics();
    }

    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
    });
   searchInput.addEventListener('input', handleSearchInput);
    clearSearchBtn.addEventListener('click', handleClearSearch);

    toggleAddEventBtn.addEventListener('click', toggleAddSection);
   cancelAddEventBtn.addEventListener('click', closeAddSection);
    eventForm.addEventListener('submit', handleFormSubmit);

    categorySelect.addEventListener('change', function () {
       if (categorySelect.value === 'Other') {
         otherCategoryWrap.hidden = false;
       otherCategoryInput.focus();
       } else {
       otherCategoryWrap.hidden = true;
         otherCategoryInput.value = '';
       clearFieldError('other-category');
     }
   });

     FIELD_IDS.forEach(function (field) {
      const input = document.getElementById('event-' + field);
       if (input) {
         input.addEventListener('input', function () {
         if (input.classList.contains('field-invalid')) {
             clearFieldError(field);
         }
         });
       }
    });

    confirmModalYes.addEventListener('click', executeDeleteEvent);
     confirmModalNo.addEventListener('click', closeConfirmModal);
    confirmModalClose.addEventListener('click', closeConfirmModal);
   confirmModal.addEventListener('click', function (e) {
     if (e.target === confirmModal) {
       closeConfirmModal();
       }
   });

     document.addEventListener('keydown', function (e) {
     if (e.key === 'Escape') {
       if (!confirmModal.hidden) {
           closeConfirmModal();
       } else if (!addEventSection.hidden) {
           closeAddSection();
       }
     }
     });
   }

  document.addEventListener('DOMContentLoaded', init);
})();
