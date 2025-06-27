// Dashboard JavaScript for LogTrackr
// Handles dashboard functionality, log display, filtering, and file upload

let currentPage = 1;
let pageSize = 10;
let currentFilters = {
    severity: '',
    search: ''
};
let logs = [];
let allLogs = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login/';
        return;
    }
    
    // Initialize dashboard
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Load initial data
        await loadStats();
        await loadLogs();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup file upload
        setupFileUpload();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        Utils.showToast('Dashboard yüklenirken hata oluştu', 'danger');
    }
}

// Load dashboard statistics
async function loadStats() {
    try {
        const stats = await api.getStatistics();
        
        // Update stat cards
        document.getElementById('totalLogs').textContent = stats.total_logs || 0;
        document.getElementById('criticalLogs').textContent = stats.critical_logs || 0;
        document.getElementById('uniqueIPs').textContent = stats.unique_ips || 0;
        document.getElementById('todayLogs').textContent = stats.today_logs || 0;
        
    } catch (error) {
        console.error('Stats loading error:', error);
        Utils.showToast('İstatistikler yüklenemedi', 'warning');
    }
}

// Load logs with pagination and filtering
async function loadLogs(page = 1) {
    try {
        const params = {
            page: page,
            page_size: pageSize,
            ...currentFilters
        };
        
        const response = await api.getLogs(params);

        // Accept both paginated and plain list responses
        if (Array.isArray(response)) {
            logs = response;
            updatePagination(response.length, page); // You may want to adjust this
        } else {
            logs = response.results || [];
            updatePagination(response.count || 0, page);
        }

        // Update table
        updateLogsTable();
        currentPage = page;
        
    } catch (error) {
        console.error('Logs loading error:', error);
        Utils.showToast('Loglar yüklenemedi', 'danger');
        
        // Show error in table
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Loglar yüklenemedi. Lütfen sayfayı yenileyin.
                </td>
            </tr>
        `;
    }
}

// Update logs table
function updateLogsTable() {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>
                    Henüz log kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${Utils.formatDate(log.receive_time)}</td>
            <td>
                <span class="badge bg-secondary">${log.type}</span>
            </td>
            <td>${Utils.formatSeverity(log.severity)}</td>
            <td>
                <span class="text-monospace">${log.threat}</span>
            </td>
            <td>
                <code>${log.source_ip}</code>
            </td>
        </tr>
    `).join('');
}

// Update pagination
function updatePagination(totalCount, currentPage) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1)">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a></li>`;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1) return;
    loadLogs(page);
}

// Setup event listeners
function setupEventListeners() {
    // Severity filter
    const severityFilter = document.getElementById('severityFilter');
    severityFilter.addEventListener('change', function() {
        currentFilters.severity = this.value;
        currentPage = 1;
        loadLogs();
    });
    
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = Utils.debounce(function(value) {
        currentFilters.search = value;
        currentPage = 1;
        loadLogs();
    }, 300);
    
    searchInput.addEventListener('input', function() {
        debouncedSearch(this.value);
    });
    
    // Handle enter key in search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = this.value;
            currentPage = 1;
            loadLogs();
        }
    });
}

// Clear filters
function clearFilters() {
    document.getElementById('severityFilter').value = '';
    document.getElementById('searchInput').value = '';
    currentFilters = { severity: '', search: '' };
    currentPage = 1;
    loadLogs();
}

// Setup file upload functionality
function setupFileUpload() {
    const uploadForm = document.getElementById('uploadForm');
    const csvFile = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    
    // File input change
    csvFile.addEventListener('change', function() {
        if (this.files.length > 0) {
            validateAndShowFile(this.files[0]);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('click', function() {
        csvFile.click();
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('border-primary');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('border-primary');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('border-primary');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            csvFile.files = files;
            validateAndShowFile(files[0]);
        }
    });
    
    // Form submit
    uploadForm.addEventListener('submit', handleFileUpload);
}

// Validate and show file info
function validateAndShowFile(file) {
    const validation = Utils.validateFile(file, ['.csv'], 10 * 1024 * 1024);
    const uploadArea = document.getElementById('uploadArea');
    
    if (!validation.valid) {
        Utils.showToast(validation.error, 'danger');
        uploadArea.innerHTML = `
            <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
            <p class="text-danger">${validation.error}</p>
        `;
        return;
    }
    
    uploadArea.innerHTML = `
        <i class="fas fa-file-csv fa-3x text-success mb-3"></i>
        <p class="text-success"><strong>${file.name}</strong></p>
        <p class="text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
    `;
}

// Geliştirilmiş dosya yükleme işlemi
async function handleFileUpload(e) {
    e.preventDefault();
    
    const csvFile = document.getElementById('csvFile');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');
    const uploadButton = e.target.querySelector('button[type="submit"]');
    
    if (!csvFile.files.length) {
        Utils.showToast('Lütfen bir dosya seçin', 'warning');
        return;
    }
    
    const file = csvFile.files[0];
    const validation = Utils.validateFile(file, ['.csv'], 10 * 1024 * 1024);
    
    if (!validation.valid) {
        Utils.showToast(validation.error, 'danger');
        return;
    }
    
    try {
        
        // Progress göster
        uploadProgress.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('file', file);
        
        // API kontrolü
        if (typeof api === 'undefined' || !api.uploadCSV) {
            throw new Error('API servisi bulunamadı. Lütfen sayfayı yenileyin.');
        }
        
        // Progress simulation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 85) progress = 85;
            progressBar.style.width = progress + '%';
            progressBar.textContent = Math.round(progress) + '%';
        }, 300);
        
        // Timeout için AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout
        
        // Upload işlemi
        const response = await api.uploadCSV(formData, {
            signal: controller.signal,
            onUploadProgress: (progressEvent) => {
                if (progressEvent.lengthComputable) {
                    const percentComplete = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.style.width = percentComplete + '%';
                    progressBar.textContent = percentComplete + '%';
                }
            }
        });
        
        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        
        // Başarılı tamamlama
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        progressBar.classList.add('bg-success');
        
        // Başarı mesajı
        Utils.showToast(`Dosya başarıyla yüklendi! ${response.processed_rows || ''} kayıt işlendi.`, 'success');
        
        // Modal kapat
        const uploadModal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
        if (uploadModal) {
            uploadModal.hide();
        }
        
        // Form sıfırla
        resetUploadForm();
        
        // Verileri yenile
        setTimeout(async () => {
            await loadStats();
            await loadLogs();
        }, 1000);
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Hata türüne göre mesaj
        let errorMessage = 'Dosya yüklenirken hata oluştu.';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Yükleme işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
            errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
        } else if (error.message.includes('API')) {
            errorMessage = 'API servisi ile iletişim kurulamadı. Lütfen sayfayı yenileyin.';
        } else if (error.response?.status === 413) {
            errorMessage = 'Dosya çok büyük. Maksimum 10MB yükleyebilirsiniz.';
        } else if (error.response?.status === 400) {
            errorMessage = 'Geçersiz dosya formatı. Lütfen geçerli bir CSV dosyası seçin.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
            // Redirect to login
            setTimeout(() => {
                window.location.href = '/login/';
            }, 2000);
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        Utils.showToast(errorMessage, 'danger');
        
        // Progress bar'ı hata durumuna getir
        progressBar.classList.remove('bg-success');
        progressBar.classList.add('bg-danger');
        progressBar.textContent = 'Hata!';
        
        // 3 saniye sonra progress gizle
        setTimeout(() => {
            uploadProgress.classList.add('d-none');
            progressBar.classList.remove('bg-danger');
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
        }, 3000);
    } 
}

// Upload form sıfırlama
function resetUploadForm() {
    const csvFile = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');
    
    csvFile.value = '';
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
        <p class="text-muted">Dosyayı buraya sürükleyin veya tıklayın</p>
        <small class="text-muted">Maksimum dosya boyutu: 10MB</small>
    `;
    
    uploadProgress.classList.add('d-none');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressBar.classList.remove('bg-success', 'bg-danger');
}

// API kontrolü ve bağlantı testi
async function testAPIConnection() {
    try {
        // API objesinin varlığını kontrol et
        if (typeof api === 'undefined') {
            throw new Error('API objesi tanımlı değil');
        }
        
        // Basit bir test isteği gönder
        await api.getStatistics();
        return { success: true };
        
    } catch (error) {
        console.error('API bağlantı testi başarısız:', error);
        return { 
            success: false, 
            error: error.message || 'API bağlantısı kurulamadı' 
        };
    }
}

// Gelişmiş dosya validasyonu
function validateUploadFile(file) {
    const validation = {
        valid: true,
        errors: []
    };
    
    // File existence
    if (!file) {
        validation.valid = false;
        validation.errors.push('Dosya seçilmedi');
        return validation;
    }
    
    // File type
    const allowedTypes = ['.csv', 'text/csv', 'application/csv'];
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (!fileName.endsWith('.csv') && !allowedTypes.includes(fileType)) {
        validation.valid = false;
        validation.errors.push('Sadece CSV dosyaları kabul edilir');
    }
    
    // File size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        validation.valid = false;
        validation.errors.push('Dosya boyutu 10MB\'dan büyük olamaz');
    }
    
    // Minimum size check
    if (file.size < 10) {
        validation.valid = false;
        validation.errors.push('Dosya çok küçük veya boş');
    }
    
    return validation;
}

// Modal açılırken API bağlantısını test et
document.getElementById('uploadModal')?.addEventListener('show.bs.modal', async function() {
    const connectionTest = await testAPIConnection();
    
    if (!connectionTest.success) {
        Utils.showToast('API bağlantısı kurulamadı: ' + connectionTest.error, 'warning');
    }
});

// Sayfa yüklenirken API kontrolü
document.addEventListener('DOMContentLoaded', function() {
    // API kontrolü
    setTimeout(async () => {
        const connectionTest = await testAPIConnection();
        
        if (!connectionTest.success) {
            console.warn('API bağlantı sorunu:', connectionTest.error);
            // Kullanıcıya bilgi verme (opsiyonel)
            // Utils.showToast('API bağlantısında sorun var', 'warning');
        }
    }, 2000);
});

// Export functions for global access
window.changePage = changePage;
window.clearFilters = clearFilters;