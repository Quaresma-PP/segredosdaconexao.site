/*
 * Profile Picture — shared para toda a pasta up/
 * Fonte única (acessoblindagem, fila-2, etc.)
 *
 * Alinhado com start/js/profile-picture.js:
 * usa proxy relativo /api/profile-picture (Cloudflare Pages Functions)
 */

const PROFILE_SELECTORS = '#imgProfile, #fotoperfil, #fotoperfiltoda, #perfiltfotto';
const PIC_STORAGE_KEY = 'picwpp';
const PIC_PHONE_KEY = 'picwpp_phone';
const PIC_UP_LEGACY_KEY = 'picwppprofile-up';
const DEFAULT_IMAGE = 'images/perfil.jpg';

function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value) {
    let phone = digitsOnly(value);
    if (!phone) return '';
    if (phone.startsWith('55') && phone.length > 11) {
        phone = phone.substring(2);
    }
    return phone;
}

function resolvePhoneNumber(phoneOverride) {
    if (phoneOverride) {
        const phone = digitsOnly(phoneOverride);
        if (phone.length >= 10) return phone;
    }

    const fromPhoneNumber = localStorage.getItem('phoneNumber');
    if (fromPhoneNumber) {
        const phone = digitsOnly(fromPhoneNumber);
        if (phone.length >= 10) return phone;
    }

    const fromStorage = localStorage.getItem('userFormattedNumber');
    if (fromStorage) {
        const phone = digitsOnly(fromStorage);
        if (phone.length >= 10) return phone;
    }

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('celular') || params.get('numero') || params.get('number') || '';
    const phone = digitsOnly(fromUrl);
    if (phone.length >= 10) return phone;

    return '';
}

function updateImageElement(imageUrl, targetId) {
    if (!imageUrl) return;

    if (typeof atualizarImagem === 'function' && atualizarImagem !== updateImageElement) {
        try {
            atualizarImagem(imageUrl);
        } catch (err) {
            console.error('Erro em atualizarImagem:', err);
        }
    }

    if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
            el.src = imageUrl;
            el.classList.add('imagemArredondada');
        }
    }

    const elements = document.querySelectorAll(PROFILE_SELECTORS);
    elements.forEach((imgElement) => {
        imgElement.src = imageUrl;
        imgElement.classList.add('imagemArredondada');
    });

    if (!targetId && !elements.length) {
        console.error('Nenhum elemento de perfil encontrado:', PROFILE_SELECTORS);
    }
}

function setPictureCache(imageUrl, cleanPhone) {
    try {
        localStorage.setItem(PIC_STORAGE_KEY, imageUrl);
        if (cleanPhone) localStorage.setItem(PIC_PHONE_KEY, cleanPhone);
        // legado das páginas up
        localStorage.setItem(PIC_UP_LEGACY_KEY, imageUrl);
    } catch (e) {
        console.error('Falha ao salvar cache da foto:', e);
    }
}

function getCachedPicture(cleanPhone) {
    try {
        const savedPicture =
            localStorage.getItem(PIC_STORAGE_KEY) ||
            localStorage.getItem(PIC_UP_LEGACY_KEY);
        const savedPhone = localStorage.getItem(PIC_PHONE_KEY);

        if (!savedPicture || savedPicture === DEFAULT_IMAGE) return null;

        if (!cleanPhone || !savedPhone || savedPhone === cleanPhone) {
            return savedPicture;
        }

        localStorage.removeItem(PIC_STORAGE_KEY);
        localStorage.removeItem(PIC_PHONE_KEY);
        localStorage.removeItem(PIC_UP_LEGACY_KEY);
        return null;
    } catch (e) {
        return null;
    }
}

async function getWhatsAppProfilePicture(phoneOverride, targetId) {
    try {
        const rawPhone = phoneOverride || resolvePhoneNumber();

        if (!rawPhone || digitsOnly(rawPhone).length < 10) {
            console.log('Número não encontrado (localStorage/URL)');
            return null;
        }

        const cleanPhone = normalizePhone(rawPhone);

        if (cleanPhone.length < 10) {
            console.log('Número inválido:', cleanPhone);
            return null;
        }

        console.log('Buscando foto para o número:', cleanPhone);

        const response = await fetch(
            `/api/profile-picture?phone=${encodeURIComponent(cleanPhone)}&timestamp=${Date.now()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.image) {
            setPictureCache(data.image, cleanPhone);
            console.log('Foto de perfil salva no localStorage:', data.image);
            updateImageElement(data.image, targetId);
            return data.image;
        }

        console.log('Foto não encontrada:', data.error || 'Erro desconhecido');
        return null;
    } catch (error) {
        console.error('Erro ao buscar foto de perfil:', error);
        return null;
    }
}

function loadProfilePicture(phoneOverride, targetId) {
    const rawPhone = phoneOverride || resolvePhoneNumber();
    const cleanPhone = normalizePhone(rawPhone);
    const cached = getCachedPicture(cleanPhone);

    if (cached) {
        console.log('Foto em cache para o número atual:', cleanPhone || '(sem phone key)');
        updateImageElement(cached, targetId);
        return cached;
    }

    getWhatsAppProfilePicture(rawPhone || cleanPhone, targetId);
    return null;
}

/**
 * API usada pelos HTMLs do up (etapa2/etapa3).
 * Retorna Promise para suportar .then()/.catch() existentes.
 */
async function fetchProfilePicture(phoneNumber, targetId) {
    console.log('fetchProfilePicture chamada para:', phoneNumber, 'targetId:', targetId);

    const rawPhone = phoneNumber || resolvePhoneNumber();
    const cleanPhone = normalizePhone(rawPhone);
    const cached = getCachedPicture(cleanPhone);

    if (cached) {
        updateImageElement(cached, targetId || 'fotoperfil');
        return cached;
    }

    const image = await getWhatsAppProfilePicture(rawPhone || cleanPhone, targetId || 'fotoperfil');
    if (image) return image;

    setTimeout(() => {
        if (typeof exibirImagemPadrao === 'function') exibirImagemPadrao();
    }, 800);
    throw new Error('Foto não encontrada');
}

function atualizarImagem(novaUrl) {
    updateImageElement(novaUrl);
}

function exibirImagemPadrao() {
    const el = document.getElementById('fotoperfil') || document.querySelector(PROFILE_SELECTORS);
    if (el) {
        el.src = DEFAULT_IMAGE;
        el.classList.add('imagemArredondada');
    }
}

if (typeof window !== 'undefined') {
    window.getWhatsAppProfilePicture = getWhatsAppProfilePicture;
    window.loadProfilePicture = loadProfilePicture;
    window.fetchProfilePicture = fetchProfilePicture;
    window.updateImageElement = updateImageElement;
    window.atualizarImagem = atualizarImagem;
    window.exibirImagemPadrao = exibirImagemPadrao;
}
