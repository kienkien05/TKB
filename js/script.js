let draggedElement = null;
let scheduleData = {};
let subjectsData = [];
let scheduledSubjects = new Set();

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    renderSubjectsList();
    initializeDragAndDrop();
    initializeTrashZone();
    loadFormData(); // Tự động load thông tin form đã lưu
    
    // Initialize time slot selection
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('selected');
        });
    });
    loadState();
});

// Tab functionality
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function addSubjectToSchedule(subject, day) {
    subject.periods.forEach(period => {
        const key = `${day}-${period}`;
        const cell = document.querySelector(`[data-day="${day}"][data-period="${period}"]`);
        
        if (cell) {
            // Clear existing content
            cell.innerHTML = '';
            
            // Create scheduled subject element
            const scheduledSubject = createScheduledSubject(subject);
            cell.appendChild(scheduledSubject);
            
            // Store in schedule data
            scheduleData[key] = {
                subject: subject.id,
                element: scheduledSubject
            };
        }
    });
    
    // Reinitialize drag events for new elements
    initializeSubjectDragEvents();
}

// Function để kiểm tra xung đột lịch học
function checkScheduleConflicts(newSubject) {
    const conflicts = [];
    
    newSubject.periods.forEach(period => {
        const key = `${newSubject.day}-${period}`;
        if (scheduleData[key] && scheduleData[key].subject !== newSubject.id) {
            const conflictSubject = subjectsData.find(s => s.id === scheduleData[key].subject);
            conflicts.push({
                period: period,
                subject: conflictSubject ? conflictSubject.name : 'Không xác định'
            });
        }
    });
    
    if (conflicts.length > 0) {
        const conflictMessage = conflicts.map(c => `Tiết ${c.period}: ${c.subject}`).join(', ');
        return {
            hasConflict: true,
            message: conflictMessage
        };
    }
    
    return { hasConflict: false };
}
function saveFormData(data) {
    const formData = {
        teacher: data.teacher,
        room: data.room,
        // Có thể lưu thêm các thông tin khác
    };
    
    try {
        localStorage.setItem('tkb_form_data', JSON.stringify(formData));
    } catch (e) {
        console.log('Không thể lưu form data:', e);
    }
}

// Tải thông tin form đã lưu
function loadFormData() {
    try {
        const saved = localStorage.getItem('tkb_form_data');
        if (saved) {
            const formData = JSON.parse(saved);
            
            // Tự động điền lại giảng viên và phòng học
            if (formData.teacher) {
                document.getElementById('subject-teacher').value = formData.teacher;
            }
            if (formData.room) {
                document.getElementById('subject-room').value = formData.room;
            }
        }
    } catch (e) {
        console.log('Không thể tải form data:', e);
    }
}

// Xóa form một cách có chọn lọc (giữ lại một số thông tin)
function clearFormSelectively() {
    // KHÔNG xóa gì cả - giữ nguyên toàn bộ form
    // Chỉ bỏ chọn các tiết học để user có thể chọn tiết khác
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Tùy chọn: có thể xóa thứ để user chọn thứ khác
    // document.getElementById('subject-day').value = '';
    
    // Giữ nguyên tất cả các trường khác:
    // - subject-name (tên môn)
    // - subject-code (mã môn) 
    // - subject-teacher (giảng viên)
    // - subject-room (phòng học)
}
        // Add new subject
function addSubject() {
    const name = document.getElementById('subject-name').value.trim();
    const code = document.getElementById('subject-code').value.trim();
    const teacher = document.getElementById('subject-teacher').value.trim();
    const day = document.getElementById('subject-day').value;
    const room = document.getElementById('subject-room').value.trim();
    
    const selectedPeriods = Array.from(document.querySelectorAll('.time-slot-btn.selected'))
        .map(btn => parseInt(btn.dataset.period));

    if (!name || !code || !teacher || !day || selectedPeriods.length === 0 || !room) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    // Tạo ID duy nhất cho môn học
    const subjectId = `${code}_${day}_${selectedPeriods.join('-')}`;

    // Kiểm tra trùng lặp
    if (subjectsData.find(s => s.id === subjectId)) {
        showNotification('Môn học với thời gian này đã tồn tại!', 'error');
        return;
    }

    const newSubject = {
        id: subjectId,
        name: name,
        code: code,
        teacher: teacher,
        day: day,
        periods: selectedPeriods.sort((a, b) => a - b),
        room: room,
        type: getSubjectType(name.toLowerCase())
    };

    // Kiểm tra xung đột
    const conflictCheck = checkScheduleConflicts(newSubject);
    if (conflictCheck.hasConflict) {
        showNotification(`❌ Xung đột ca học! ${conflictCheck.message}`, 'error');
        return;
    }

    // Lưu thông tin form để tái sử dụng
    saveFormData({
        teacher: teacher,
        room: room
    });

    // Thêm vào danh sách và tự động xếp lịch
    subjectsData.push(newSubject);
    scheduledSubjects.add(newSubject.id);
    addSubjectToSchedule(newSubject, newSubject.day);
    
    renderSubjectsList();
    clearFormSelectively(); // Sử dụng clear có chọn lọc
    saveState();
    
    const periodsText = newSubject.periods.length > 1 ? 
        `${newSubject.periods[0]}-${newSubject.periods[newSubject.periods.length - 1]}` : 
        newSubject.periods[0];
    
    showNotification(`✨ Đã thêm và tự động xếp ${newSubject.name} vào ${getDayName(newSubject.day)}, tiết ${periodsText}!`, 'success');
}

function getSubjectType(name) {
    if (name.includes('học máy') || name.includes('machine learning')) return 'ml';
    if (name.includes('dữ liệu lớn') || name.includes('big data')) return 'bigdata';
    if (name.includes('hệ điều hành') || name.includes('operating system')) return 'os';
    if (name.includes('iot') || name.includes('internet of things')) return 'iot';
    if (name.includes('trí tuệ nhân tạo') || name.includes('ai') || name.includes('artificial intelligence')) return 'ai';
    return 'default';
}

function clearForm() {
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-code').value = '';
    document.getElementById('subject-teacher').value = '';
    document.getElementById('subject-day').value = '';
    document.getElementById('subject-room').value = '';
    document.querySelectorAll('.time-slot-btn').forEach(btn => btn.classList.remove('selected'));
}

// Render subjects list
function renderSubjectsList() {
    const container = document.getElementById('subjects-list');
    container.innerHTML = '';
    
    const availableSubjects = subjectsData.filter(subject => !scheduledSubjects.has(subject.id));
    
    if (availableSubjects.length === 0) {
        container.innerHTML = `
            <div style="
                text-align: center; 
                color: var(--text-secondary); 
                padding: 40px 20px;
                margin: 10px 0;
            ">
                <div style="font-size: 2em; margin-bottom: 10px;">📚</div>
                <div>Chưa có môn học nào</div>
                <div style="font-size: 0.9em; margin-top: 5px;">Thêm môn học mới ở tab bên trái</div>
            </div>
        `;
        return;
    }
    
    availableSubjects.forEach(subject => {
        const subjectElement = createSubjectElement(subject);
        container.appendChild(subjectElement);
    });
    
    // Re-initialize drag events for new elements
    initializeSubjectDragEvents();
}

function createSubjectElement(subject) {
    const div = document.createElement('div');
    div.className = `subject-item ${subject.type}`;
    div.draggable = true;
    div.dataset.subject = subject.id;
    
    const periodsText = subject.periods.length > 1 ? 
        `${subject.periods[0]}-${subject.periods[subject.periods.length - 1]}` : 
        subject.periods[0];
    
    const dayNames = {
        '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', 
        '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7', '8': 'Chủ nhật'
    };
    
    div.innerHTML = `
        <strong>${subject.name} (${subject.code})</strong><br>
        GV: ${subject.teacher}<br>
        ${dayNames[subject.day]}, tiết ${periodsText}, ${subject.room}
        <button class="delete-btn" onclick="deleteSubject('${subject.id}'); event.stopPropagation();" title="Xóa môn học">×</button>
    `;
    
    // Add double click event for auto-scheduling
    div.addEventListener('dblclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
        autoAddToSchedule(subject.id);
    });
    
    return div;
}

// Delete subject
function deleteSubject(subjectId) {
    if (confirm('Bạn có chắc chắn muốn xóa môn học này?')) {
        subjectsData = subjectsData.filter(s => s.id !== subjectId);
        removeSubjectFromSchedule(subjectId);
        renderSubjectsList();
        showNotification('Đã xóa môn học!', 'success');
    }
}

// Search subjects
function searchSubjects() {
    const searchTerm = document.getElementById('search-box').value.toLowerCase();
    const subjectItems = document.querySelectorAll('.subject-item');
    
    subjectItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Drag and Drop functionality
function initializeDragAndDrop() {
    initializeScheduleCellDropZones();
    initializeSubjectsListDropZone();
}

function initializeSubjectDragEvents() {
    // Add drag events to subject items
    document.querySelectorAll('.subject-item').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedElement = this;
            e.dataTransfer.effectAllowed = 'move';
            this.style.opacity = '0.5';
        });

        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            draggedElement = null;
        });
    });

    // Add drag events to scheduled subjects
    document.querySelectorAll('.scheduled-subject').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedElement = this;
            e.dataTransfer.effectAllowed = 'move';
            this.style.opacity = '0.5';
        });

        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            draggedElement = null;
        });
    });
}

function initializeScheduleCellDropZones() {
    const scheduleCells = document.querySelectorAll('.schedule-cell');
    scheduleCells.forEach(cell => {
        cell.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });

        cell.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            handleScheduleDrop(e, this);
        });
    });
}

function initializeSubjectsListDropZone() {
    const subjectsList = document.getElementById('subjects-list');
    
    subjectsList.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
    });
    
    subjectsList.addEventListener('dragleave', function(e) {
        // Only remove highlight when actually leaving the entire drop zone
        const rect = this.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            this.classList.remove('drag-over');
        }
    });
    
    subjectsList.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        handleSubjectsListDrop(e);
    });
}

function autoScheduleAll() {
    if (subjectsData.length === 0) {
        showNotification('Không có môn học nào để tự động xếp lịch!', 'warning');
        return;
    }

    let scheduled = 0;
    let conflicts = 0;

    subjectsData.forEach(subject => {
        if (!scheduledSubjects.has(subject.id)) {
            const conflictPeriods = checkPeriodConflicts(subject, subject.day);
            if (conflictPeriods.length === 0) {
                scheduledSubjects.add(subject.id);
                addSubjectToSchedule(subject, subject.day);
                scheduled++;
            } else {
                conflicts++;
            }
        }
    });

    renderSubjectsList();
    
    if (scheduled > 0) {
        showNotification(`✨ Đã tự động xếp ${scheduled} môn học!${conflicts > 0 ? ` (${conflicts} môn bị xung đột)` : ''}`, 'success');
    } else if (conflicts > 0) {
        showNotification(`❌ Không thể xếp lịch do ${conflicts} môn bị xung đột!`, 'error');
    } else {
        showNotification('Tất cả môn học đã được xếp lịch!', 'warning');
    }
}

// Auto add to schedule function
function autoAddToSchedule(subjectId) {
    const subject = subjectsData.find(s => s.id === subjectId);
    if (!subject) {
        showNotification('Không tìm thấy thông tin môn học!', 'error');
        return;
    }

    if (scheduledSubjects.has(subjectId)) {
        showNotification('Môn học đã có trong thời khóa biểu!', 'warning');
        return;
    }

    const conflictPeriods = checkPeriodConflicts(subject, subject.day);
    if (conflictPeriods.length > 0) {
        const conflictDetails = conflictPeriods.map(period => {
            const key = `${subject.day}-${period}`;
            const conflictSubject = subjectsData.find(s => s.id === scheduleData[key].subject);
            return `Tiết ${period}: ${conflictSubject ? conflictSubject.name : 'Không xác định'}`;
        }).join(', ');
        
        showNotification(`❌ Không thể tự động xếp lịch!\nXung đột: ${conflictDetails}`, 'error');
        return;
    }

    scheduledSubjects.add(subjectId);
    addSubjectToSchedule(subject, subject.day);
    renderSubjectsList();

    const periodsText = subject.periods.length > 1 ? 
        `${subject.periods[0]}-${subject.periods[subject.periods.length - 1]}` : 
        subject.periods[0];
    
    showNotification(`✨ Tự động xếp ${subject.name} vào ${getDayName(subject.day)}, tiết ${periodsText}`, 'success');
}

function handleScheduleDrop(e, targetCell) {
    if (!draggedElement) return;

    const targetDay = targetCell.dataset.day;
    const targetPeriod = parseInt(targetCell.dataset.period);

    if (!targetDay || !targetPeriod) return;

    // Get subject data
    const subjectId = draggedElement.dataset.subject;
    const subject = subjectsData.find(s => s.id === subjectId);
    
    if (!subject) {
        showNotification('Không tìm thấy thông tin môn học!', 'error');
        return;
    }

    // Check if the target matches subject's original schedule
    if (subject.day !== targetDay || !subject.periods.includes(targetPeriod)) {
        showNotification(`Môn ${subject.name} không có lịch học vào ${getDayName(targetDay)}, tiết ${targetPeriod}!`, 'warning');
        return;
    }

    // Check for conflicts
    const conflictPeriods = checkPeriodConflicts(subject, targetDay);
    if (conflictPeriods.length > 0) {
        showNotification(`Không thể xếp lịch! Các tiết ${conflictPeriods.join(', ')} đã có môn học khác.`, 'error');
        return;
    }

    // Remove from original position if moving from schedule
    if (draggedElement.classList.contains('scheduled-subject')) {
        removeSubjectFromSchedule(subjectId);
    } else {
        // Mark as scheduled
        scheduledSubjects.add(subjectId);
        renderSubjectsList();
    }

    // Add subject to all required periods
    addSubjectToSchedule(subject, targetDay);

    const periodsText = subject.periods.length > 1 ? 
        `${subject.periods[0]}-${subject.periods[subject.periods.length - 1]}` : 
        subject.periods[0];
    
    showNotification(`Đã xếp ${subject.name} vào ${getDayName(targetDay)}, tiết ${periodsText}`, 'success');
}

function handleSubjectsListDrop(e) {
    if (!draggedElement || !draggedElement.classList.contains('scheduled-subject')) return;
    
    const subjectId = draggedElement.dataset.subject;
    removeSubjectFromSchedule(subjectId);
    renderSubjectsList();
    showNotification('Đã trả môn học về danh sách!', 'success');
}

// Helper functions for multi-period scheduling
function checkPeriodConflicts(subject, targetDay) {
    const conflictPeriods = [];
    
    subject.periods.forEach(period => {
        const key = `${targetDay}-${period}`;
        if (scheduleData[key] && scheduleData[key].subject !== subject.id) {
            conflictPeriods.push(period);
        }
    });
    
    return conflictPeriods;
}

function addSubject() {
    const name = document.getElementById('subject-name').value.trim();
    const code = document.getElementById('subject-code').value.trim();
    const teacher = document.getElementById('subject-teacher').value.trim();
    const day = document.getElementById('subject-day').value;
    const room = document.getElementById('subject-room').value.trim();
    
    const selectedPeriods = Array.from(document.querySelectorAll('.time-slot-btn.selected'))
        .map(btn => parseInt(btn.dataset.period));

    if (!name || !code || !teacher || !day || selectedPeriods.length === 0 || !room) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }

    const subjectId = `${code}_${day}_${selectedPeriods.join('-')}`;

    if (subjectsData.find(s => s.id === subjectId)) {
        showNotification('Môn học với thời gian này đã tồn tại!', 'error');
        return;
    }

    const newSubject = {
        id: subjectId,
        name: name,
        code: code,
        teacher: teacher,
        day: day,
        periods: selectedPeriods.sort((a, b) => a - b),
        room: room,
        type: getSubjectType(name.toLowerCase())
    };

    const conflictCheck = checkScheduleConflicts(newSubject);
    if (conflictCheck.hasConflict) {
        showNotification(`❌ Xung đột ca học! ${conflictCheck.message}`, 'error');
        return;
    }

    subjectsData.push(newSubject);
    scheduledSubjects.add(newSubject.id);
    addSubjectToSchedule(newSubject, newSubject.day);
    
    renderSubjectsList();
    // XÓA DÒNG NÀY: clearForm();
    // CHỈ BỎ CHỌN TIẾT HỌC
    document.querySelectorAll('.time-slot-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    saveState();
    
    const periodsText = newSubject.periods.length > 1 ? 
        `${newSubject.periods[0]}-${newSubject.periods[newSubject.periods.length - 1]}` : 
        newSubject.periods[0];
    
    showNotification(`✨ Đã thêm và tự động xếp ${newSubject.name} vào ${getDayName(newSubject.day)}, tiết ${periodsText}!`, 'success');
}

function saveState() {
    const data = {
        subjectsData: subjectsData,
        // only save mapping key -> subject id
        scheduleData: Object.keys(scheduleData).reduce((acc, key) => {
            acc[key] = { subject: scheduleData[key].subject };
            return acc;
        }, {})
    };
    try {
        localStorage.setItem('tkb_state', JSON.stringify(data));
        // optional: small notif
        // showNotification('Đã lưu trạng thái TKB vào trình duyệt.', 'success');
    } catch (e) {
        console.error('Lưu trạng thái thất bại', e);
        showNotification('Lưu trạng thái thất bại (localStorage).', 'error');
    }
}

function loadState() {
    const raw = localStorage.getItem('tkb_state');
    if (!raw) return;
    try {
        const loaded = JSON.parse(raw);
        if (loaded.subjectsData) subjectsData = loaded.subjectsData;
        // clear existing schedule
        const scheduledElements = document.querySelectorAll('.scheduled-subject');
        scheduledElements.forEach(s => s.remove());
        scheduleData = {};

        if (loaded.scheduleData) {
            Object.keys(loaded.scheduleData).forEach(key => {
                const [day, period] = key.split('-');
                const cell = document.querySelector(`[data-day="${day}"][data-period="${period}"]`);
                if (cell) {
                    const subjectId = loaded.scheduleData[key].subject;
                    const subject = subjectsData.find(s => s.id === subjectId);
                    if (subject) {
                        cell.innerHTML = '';
                        const scheduledSubject = createScheduledSubject(subject);
                        cell.appendChild(scheduledSubject);
                        scheduleData[key] = { subject: subjectId, element: scheduledSubject };
                    }
                }
            });
        }

        renderSubjectsList();
        initializeSubjectDragEvents();
        // showNotification('Đã tải trạng thái TKB từ trình duyệt.', 'success');
    } catch (e) {
        console.error('Load trạng thái thất bại', e);
        showNotification('Không thể tải trạng thái lưu trước đó.', 'error');
    }
}
function removeSubjectFromSchedule(subjectId) {
    // Find and remove all instances of this subject from schedule
    Object.keys(scheduleData).forEach(key => {
        if (scheduleData[key].subject === subjectId) {
            if (scheduleData[key].element && scheduleData[key].element.parentNode) {
                scheduleData[key].element.remove();
            }
            delete scheduleData[key];
        }
    });
    
    // Remove from scheduled subjects set
    scheduledSubjects.delete(subjectId);
}

function getDayName(day) {
    const dayNames = {
        '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', 
        '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7', '8': 'Chủ nhật'
    };
    return dayNames[day] || `Thứ ${day}`;
}

function createScheduledSubject(subject) {
    const scheduled = document.createElement('div');
    scheduled.className = `scheduled-subject ${subject.type}`;
    scheduled.draggable = true;
    scheduled.dataset.subject = subject.id;
    
    scheduled.innerHTML = `
        <strong>${subject.name}</strong><br>
        ${subject.code}<br>
        ${subject.room}
    `;
    
    return scheduled;
}

// Trash zone functionality
function initializeTrashZone() {
    const trashZone = document.getElementById('trash-zone');
    
    trashZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this.classList.add('drag-over');
    });
    
    trashZone.addEventListener('dragleave', function(e) {
        this.classList.remove('drag-over');
    });
    
    trashZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (!draggedElement) return;
        
        const subjectId = draggedElement.dataset.subject;
        
        // Xóa hoàn toàn môn học khỏi danh sách
        subjectsData = subjectsData.filter(s => s.id !== subjectId);
        
        // Xóa khỏi thời khóa biểu (nếu có)
        removeSubjectFromSchedule(subjectId);
        
        // Cập nhật lại giao diện
        renderSubjectsList();
        
        showNotification('Đã xóa môn học hoàn toàn!', 'success');
    });
}

// Schedule management functions
function clearSchedule() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch học?')) {
        const scheduledElements = document.querySelectorAll('.scheduled-subject');
        scheduledElements.forEach(subject => subject.remove());
        scheduleData = {};
        scheduledSubjects.clear();
        renderSubjectsList();
        showNotification('Đã xóa toàn bộ thời khóa biểu!', 'success');
    }
}

async function saveSchedule() {
    const scheduleTable = document.querySelector('.schedule-table');

    // Tạo container cho screenshot
    const screenshotDiv = document.createElement('div');
    screenshotDiv.className = 'screenshot-container';
    screenshotDiv.style.position = 'absolute';
    screenshotDiv.style.left = '-9999px';
    screenshotDiv.style.top = '0';
    screenshotDiv.innerHTML = `
        <div class="screenshot-title">📚 THỜI KHÓA BIỂU</div>
        ${scheduleTable.outerHTML}
    `;
    
    // Thêm class cho table trong screenshot
    const tableInScreenshot = screenshotDiv.querySelector('.schedule-table');
    tableInScreenshot.classList.add('screenshot-table');
    
    document.body.appendChild(screenshotDiv);

    try {
        const canvas = await html2canvas(screenshotDiv, {
            backgroundColor: '#1a1f2e', // Nền tối
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: screenshotDiv.scrollWidth,
            height: screenshotDiv.scrollHeight,
            x: 0,
            y: 0
        });

        // Tạo link download
        const link = document.createElement('a');
        link.download = `thoi-khoa-bieu-${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        showNotification('📸 Đã lưu thời khóa biểu đẹp!', 'success');
    } catch (error) {
        showNotification('Lỗi khi chụp ảnh! Vui lòng thử lại.', 'error');
        console.error('Screenshot error:', error);
    } finally {
        document.body.removeChild(screenshotDiv);
    }
}

function loadSchedule() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const loadedData = JSON.parse(e.target.result);
                    
                    // Clear current schedule
                    const scheduledElements = document.querySelectorAll('.scheduled-subject');
                    scheduledElements.forEach(subject => subject.remove());
                    scheduleData = {};
                    scheduledSubjects.clear();
                    
                    // Load data
                    if (loadedData.subjectsData) {
                        subjectsData = loadedData.subjectsData;
                    }
                    
                    if (loadedData.scheduledSubjects) {
                        scheduledSubjects = new Set(loadedData.scheduledSubjects);
                    }
                    
                    if (loadedData.scheduleData) {
                        Object.keys(loadedData.scheduleData).forEach(key => {
                            const [day, period] = key.split('-');
                            const cell = document.querySelector(`[data-day="${day}"][data-period="${period}"]`);
                            if (cell) {
                                const subjectData = loadedData.scheduleData[key];
                                const subject = subjectsData.find(s => s.id === subjectData.subject);
                                if (subject) {
                                    cell.innerHTML = '';
                                    const scheduledSubject = createScheduledSubject(subject);
                                    cell.appendChild(scheduledSubject);
                                    scheduleData[key] = {
                                        subject: subjectData.subject,
                                        element: scheduledSubject
                                    };
                                }
                            }
                        });
                    }
                    
                    renderSubjectsList();
                    initializeSubjectDragEvents();
                    showNotification('Đã tải thời khóa biểu thành công!', 'success');
                } catch (error) {
                    showNotification('Không thể tải file lịch học. Vui lòng kiểm tra lại file.', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Auto-schedule function (placeholder)
function autoScheduleMLBigData() {
    showNotification('Tính năng tự động xếp lịch sẽ được cập nhật sớm!', 'warning');
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Tính toán vị trí dựa trên số thông báo hiện có
    const existingNotifications = document.querySelectorAll('.notification');
    const topOffset = 20 + (existingNotifications.length * 70); // 70px cho mỗi thông báo
    notification.style.top = `${topOffset}px`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
                // Điều chỉnh lại vị trí các thông báo còn lại
                updateNotificationPositions();
            }
        }, 300);
    }, 3000);
}

function updateNotificationPositions() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach((notification, index) => {
        const topOffset = 20 + (index * 70);
        notification.style.top = `${topOffset}px`;
    });
}