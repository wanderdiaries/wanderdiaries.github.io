/**
 * Colorlib Template Switcher
 * Modern vanilla JavaScript - Updated 2026
 * No jQuery or external dependencies
 */
'use strict';

// $colors is loaded from colors.js

const TemplateSwitcher = (function() {
    // State
    let currentProduct = '';
    let currentCategory = 'All';
    let currentColor = 'all';
    let currentTab = 'all';
    let lazyObserver = null;

    // Popular templates (curated list)
    const POPULAR_TEMPLATES = [
        'glint', 'jackson', 'space', 'ogani', 'cozastore', 'imagine', 'photosen',
        'academia', 'ronaldo', 'consultingbiz', 'shutter', 'transcend', 'appy',
        'photon', 'constructioncompany', 'fox', 'unfold', 'ashion', 'confer',
        'launch', 'dento', 'rezume', 'coffeeblend', 'christian', 'unioncorp',
        'kiddos', 'magdesign', 'docmed'
    ];

    // Favorites
    let favorites = new Set();

    // Cached DOM elements
    const el = {};

    /**
     * Favorites Management
     */
    const FavoritesManager = {
        STORAGE_KEY: 'colorlib_favorites',

        load() {
            try {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    favorites = new Set(Array.isArray(parsed) ? parsed : []);
                }
            } catch (e) {
                console.warn('Failed to load favorites:', e);
                favorites = new Set();
            }
            this.updateCount();
        },

        save() {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...favorites]));
            } catch (e) {
                console.warn('Failed to save favorites:', e);
            }
        },

        toggle(templateId) {
            if (favorites.has(templateId)) {
                favorites.delete(templateId);
            } else {
                favorites.add(templateId);
            }
            this.save();
            this.updateCount();
            this.updateProductUI(templateId);

            trackEvent(favorites.has(templateId) ? 'favorite_add' : 'favorite_remove', {
                template_id: templateId
            });

            return favorites.has(templateId);
        },

        isFavorited(templateId) {
            return favorites.has(templateId);
        },

        getAll() {
            return [...favorites];
        },

        updateCount() {
            const count = favorites.size;

            // Update modal tab count
            if (el.favoritesCount) {
                el.favoritesCount.textContent = count;
                el.favoritesCount.dataset.count = count;
            }

            // Update header badge
            const headerFavBtn = document.querySelector('.favorites-btn');
            const headerBadge = document.querySelector('.favorites-badge');
            if (headerFavBtn && headerBadge) {
                headerBadge.textContent = count;
                headerFavBtn.classList.toggle('has-favorites', count > 0);
            }
        },

        updateProductUI(templateId) {
            const product = el.productList.querySelector(`[data-id="${templateId}"]`);
            if (product) {
                const btn = product.querySelector('.favorite-btn');
                if (btn) {
                    const isFav = favorites.has(templateId);
                    btn.classList.toggle('favorited', isFav);
                    btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';

                    if (isFav) {
                        btn.classList.add('just-favorited');
                        setTimeout(() => btn.classList.remove('just-favorited'), 300);
                    }
                }
            }
        },

        updateAllProductUI() {
            el.productList.querySelectorAll('.favorite-btn').forEach(btn => {
                const templateId = btn.dataset.templateId;
                const isFav = favorites.has(templateId);
                btn.classList.toggle('favorited', isFav);
                btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
            });
        }
    };


    /**
     * Initialize the application
     */
    function init() {
        cacheElements();

        // Redirect mobile users to template directly
        if (isMobile() && getCurrentProductKey()) {
            const key = getCurrentProductKey();
            if (key in $products) {
                window.top.location.href = $products[key].url;
                return;
            }
        }

        setupLazyLoading();
        loadCategories();
        FavoritesManager.load();
        loadProducts();
        setupEventListeners();
        initFromURL();
        calculateIframeHeight();

        // Set initial active state for color filter
        el.colorFilters?.querySelector('[data-color="all"]')?.classList.add('active');
    }

    /**
     * Cache DOM elements for reuse
     */
    function cacheElements() {
        el.body = document.body;
        el.productList = document.querySelector('.products-list');
        el.productIframe = document.querySelector('.product-iframe');
        el.preloader = document.querySelector('.preloader');
        el.productSwitcher = document.querySelector('.product-switcher a');
        el.switcherBar = document.querySelector('.switcher-bar');
        el.switcherBody = document.querySelector('.switcher-body');
        el.productsWrapper = document.querySelector('.products-wrapper');
        el.searchInput = document.getElementById('template-search');
        el.templateCount = document.querySelector('.template-count');
        el.modalClose = document.querySelector('.modal-close');
        el.categoryFilters = document.getElementById('category-filters');
        el.colorFilters = document.getElementById('color-filters');
        el.tabNavigation = document.querySelector('.tab-navigation');
        el.favoritesCount = document.querySelector('.favorites-count');
    }

    /**
     * Check if user is on mobile device
     */
    function isMobile() {
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
            navigator.userAgent.toLowerCase()
        );
    }

    /**
     * Get product key from URL hash or query param
     */
    function getCurrentProductKey() {
        // Check hash first
        let key = window.location.hash.slice(1);
        if (key && key in $products) return key;

        // Check query param
        const params = new URLSearchParams(window.location.search);
        key = params.get('product');
        if (key && key in $products) return key;

        return null;
    }

    /**
     * Setup Intersection Observer for lazy loading
     */
    function setupLazyLoading() {
        lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.onload = () => img.classList.add('loaded');
                        img.onerror = () => {
                            img.classList.add('loaded');
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"%3E%3Crect fill="%23444" width="200" height="120"/%3E%3Ctext x="50%25" y="50%25" fill="%23999" text-anchor="middle" dy=".3em"%3ENo Preview%3C/text%3E%3C/svg%3E';
                        };
                    }
                    lazyObserver.unobserve(img);
                }
            });
        }, {
            root: el.productsWrapper,
            rootMargin: '200px',
            threshold: 0
        });
    }

    /**
     * Load category filter buttons
     */
    function loadCategories() {
        if (!el.categoryFilters) return;

        // Count templates per category
        const categoryCounts = {};
        let totalCount = 0;

        for (const product of Object.values($products)) {
            const cat = product.tag || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            totalCount++;
        }

        // Sort by count (descending), but keep "Business" first after "All"
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => {
                if (a[0] === 'Business') return -1;
                if (b[0] === 'Business') return 1;
                return b[1] - a[1];
            });

        // Build category buttons
        const fragment = document.createDocumentFragment();

        // Add "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'category-btn active';
        allBtn.dataset.category = 'All';
        allBtn.innerHTML = `All <span class="count">${totalCount}</span>`;
        fragment.appendChild(allBtn);

        // Add category buttons (limit to top 15 for UX)
        const maxCategories = 15;
        sortedCategories.slice(0, maxCategories).forEach(([cat, count]) => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = cat;
            btn.innerHTML = `${cat} <span class="count">${count}</span>`;
            fragment.appendChild(btn);
        });

        el.categoryFilters.appendChild(fragment);
    }

    /**
     * Generate search tags from template name and category
     */
    function generateTags(key, name, category) {
        const tags = new Set();
        const nameLower = name.toLowerCase();
        const keyLower = key.toLowerCase();
        const categoryLower = category.toLowerCase();

        // Add category as tag
        tags.add(categoryLower);

        // Category synonyms - map category to all related search terms
        // When someone searches ANY of these terms, templates in that category should appear
        const categorySynonyms = {
            'charity': ['church', 'nonprofit', 'ngo', 'foundation', 'donation', 'donate', 'volunteer', 'religious', 'faith', 'ministry', 'mission', 'cause', 'fundraising', 'giving', 'help', 'support', 'community', 'outreach', 'temple', 'mosque', 'synagogue', 'worship'],
            'business': ['corporate', 'company', 'agency', 'firm', 'enterprise', 'professional', 'consulting', 'consultant', 'office', 'b2b', 'services', 'solutions', 'startup'],
            'portfolio': ['cv', 'resume', 'personal', 'freelancer', 'designer', 'developer', 'artist', 'creative', 'showcase', 'work', 'projects', 'vcard'],
            'blog': ['news', 'magazine', 'article', 'journalist', 'writer', 'author', 'content', 'stories', 'posts', 'editorial', 'media'],
            'ecommerce': ['shop', 'store', 'shopping', 'products', 'sell', 'buy', 'cart', 'checkout', 'retail', 'marketplace', 'boutique', 'fashion', 'clothes', 'clothing'],
            'medical': ['health', 'healthcare', 'hospital', 'clinic', 'doctor', 'dentist', 'dental', 'pharmacy', 'medicine', 'patient', 'care', 'wellness', 'therapy', 'therapist', 'nurse', 'physician'],
            'education': ['school', 'university', 'college', 'academy', 'learning', 'course', 'courses', 'training', 'tutor', 'teacher', 'student', 'class', 'lms', 'elearning', 'online learning'],
            'real estate': ['property', 'properties', 'home', 'homes', 'house', 'houses', 'apartment', 'apartments', 'rent', 'rental', 'realtor', 'agent', 'listing', 'listings', 'interior', 'architecture'],
            'restaurant': ['food', 'cafe', 'coffee', 'bakery', 'pizza', 'burger', 'dining', 'menu', 'cook', 'cooking', 'recipe', 'recipes', 'chef', 'kitchen', 'bar', 'pub', 'catering'],
            'travel': ['hotel', 'hotels', 'tour', 'tours', 'tourism', 'vacation', 'holiday', 'trip', 'booking', 'resort', 'adventure', 'explore', 'destination', 'flight', 'cruise'],
            'fitness': ['gym', 'sport', 'sports', 'yoga', 'workout', 'exercise', 'training', 'trainer', 'athletic', 'athlete', 'crossfit', 'boxing', 'martial arts', 'health'],
            'event': ['wedding', 'party', 'conference', 'concert', 'music', 'dj', 'festival', 'celebration', 'meetup', 'gathering', 'ceremony'],
            'construction': ['building', 'builder', 'architect', 'architecture', 'contractor', 'roofing', 'renovation', 'remodel', 'handyman', 'plumber', 'electrician', 'hvac', 'industrial'],
            'finance': ['bank', 'banking', 'loan', 'loans', 'accounting', 'accountant', 'investment', 'investor', 'money', 'crypto', 'cryptocurrency', 'trading', 'insurance', 'tax', 'financial'],
            'lawyer': ['law', 'legal', 'attorney', 'justice', 'court', 'advocate', 'notary', 'solicitor', 'litigation', 'counsel'],
            'beauty': ['salon', 'spa', 'barber', 'barbershop', 'hair', 'hairdresser', 'makeup', 'cosmetic', 'skincare', 'nails', 'wellness', 'massage'],
            'pet': ['animal', 'animals', 'dog', 'dogs', 'cat', 'cats', 'vet', 'veterinary', 'veterinarian', 'pet care', 'grooming', 'shelter'],
            'transportation': ['logistics', 'shipping', 'cargo', 'car', 'cars', 'auto', 'automotive', 'taxi', 'delivery', 'moving', 'truck', 'fleet', 'transport'],
            'technology': ['tech', 'it', 'software', 'saas', 'app', 'digital', 'cyber', 'hosting', 'cloud', 'startup', 'innovation'],
            'job board': ['jobs', 'career', 'careers', 'recruitment', 'hiring', 'employment', 'hr', 'human resources', 'talent', 'staffing'],
            'photography': ['photo', 'photos', 'photographer', 'camera', 'studio', 'film', 'video', 'videography', 'media', 'creative'],
            'gaming': ['game', 'games', 'esports', 'stream', 'streamer', 'twitch', 'youtube gaming', 'player'],
            'agriculture': ['farm', 'farming', 'organic', 'garden', 'gardening', 'nursery', 'florist', 'flowers', 'plants', 'nature']
        };

        // Add all synonyms for this template's category
        for (const [cat, synonyms] of Object.entries(categorySynonyms)) {
            if (categoryLower === cat || categoryLower.includes(cat) || cat.includes(categoryLower)) {
                synonyms.forEach(syn => tags.add(syn));
                tags.add(cat); // Also add the category key itself
            }
        }

        // Common feature keywords to detect in names
        const featurePatterns = {
            // ===== TEMPLATE TYPES / INDUSTRIES =====
            'portfolio': /portfolio|folio|gallery|showcase|work|cv|resume|personal/i,
            'blog': /blog|news|magazine|article|post|journal|writer/i,
            'ecommerce': /shop|store|cart|ecommerce|product|market|fashion|cloth|boutique/i,
            'landing': /landing|launch|startup|app|saas|software|coming soon/i,
            'business': /business|corporate|company|agency|consulting|firm|office/i,
            'restaurant': /restaurant|food|cafe|coffee|recipe|pizza|burger|bakery|cook|kitchen|menu|dining|bar|pub/i,
            'medical': /medical|health|doctor|clinic|hospital|dental|pharma|care|covid|therapy|wellness/i,
            'education': /education|school|university|course|learning|tutor|academy|study|lms|elearning/i,
            'real-estate': /real estate|property|home|house|interior|estate|rent|apartment|listing|realtor/i,
            'travel': /travel|hotel|tour|vacation|trip|booking|resort|adventure|cruise/i,
            'fitness': /fitness|gym|sport|yoga|workout|training|basketball|soccer|crossfit/i,
            'event': /event|wedding|party|conference|concert|music|dj|festival/i,
            'construction': /construction|building|architect|contractor|roofing|hvac|plumber|handyman/i,
            'finance': /finance|bank|loan|accounting|investment|money|crypto|trading|insurance/i,
            'lawyer': /lawyer|law|legal|attorney|justice|notary|advocate/i,
            'beauty': /beauty|salon|spa|barber|hair|makeup|cosmetic|skincare/i,
            'charity': /charity|nonprofit|donation|foundation|volunteer|ngo|church/i,
            'job-board': /job|career|recruit|hire|employment|hr|resume|cv/i,
            'photography': /photo|video|camera|studio|creative|film|media/i,
            'pet': /pet|animal|dog|cat|vet|veterinary/i,
            'transportation': /transport|logistics|shipping|cargo|car|auto|delivery|taxi|moving/i,
            'technology': /tech|digital|it|software|cyber|hosting|domain|cloud/i,
            'gaming': /game|gaming|esport|stream|twitch/i,
            'podcast': /podcast|audio|radio|music|band/i,
            'agriculture': /farm|agriculture|organic|garden|nursery|florist/i,
            'kids': /kids|children|baby|daycare|kindergarten|toy/i,
            'fashion': /fashion|clothing|apparel|wear|style|model/i,
            'furniture': /furniture|decor|home|interior|kitchen|bathroom/i,

            // ===== UI COMPONENTS & FEATURES (what users search for) =====
            'slider': /slider|carousel|slideshow|swiper|banner|hero/i,
            'gallery': /gallery|lightbox|masonry|grid|portfolio/i,
            'video': /video|youtube|vimeo|player|embed/i,
            'contact-form': /contact|form|email|subscribe|newsletter/i,
            'google-maps': /map|location|address|directions/i,
            'testimonials': /testimonial|review|feedback|rating|client/i,
            'pricing': /pricing|price|plan|package|subscription/i,
            'team': /team|staff|member|about|people/i,
            'counter': /counter|stats|number|achievement|milestone/i,
            'timeline': /timeline|history|process|step|progress/i,
            'accordion': /accordion|faq|question|collapse|toggle/i,
            'tabs': /tab|pill|switch|segment/i,
            'modal': /modal|popup|lightbox|overlay|dialog/i,
            'menu': /menu|navigation|navbar|header|sidebar|mega/i,
            'footer': /footer|bottom|copyright/i,
            'cards': /card|box|tile|grid|block/i,
            'icons': /icon|font awesome|feather|material/i,
            'social': /social|facebook|twitter|instagram|linkedin|share/i,
            'login': /login|signin|register|signup|auth|account/i,
            'search': /search|filter|sort|find/i,
            'cart': /cart|checkout|payment|order|shop/i,
            'booking': /booking|reservation|appointment|schedule|calendar/i,
            'chat': /chat|messenger|whatsapp|support|live/i,

            // ===== DESIGN STYLES (popular searches) =====
            'dark': /dark|night|black/i,
            'minimal': /minimal|clean|simple|whitespace/i,
            'colorful': /color|creative|vibrant|gradient/i,
            'elegant': /elegant|luxury|premium|exclusive|vip/i,
            'one-page': /onepage|single|parallax|scrolling/i,
            'multi-page': /multi|page|subpage/i,
            'animated': /anim|motion|slide|fade|zoom|bounce/i,
            'flat': /flat|material|metro|modern/i,
            '3d': /3d|three|dimension|perspective/i,
            'gradient': /gradient|colorful|vibrant/i,
            'glassmorphism': /glass|blur|frosted|transparent/i,
            'neumorphism': /neumorphism|soft|shadow/i,
            'retro': /retro|vintage|classic|old|nostalgia/i,
            'futuristic': /futuristic|future|cyber|neon|sci-fi/i,
            'handwritten': /handwritten|script|cursive|brush/i,
            'bold': /bold|strong|heavy|thick/i,

            // ===== SIMILAR TO BRANDS (what users compare to) =====
            'airbnb': /airbnb|booking|rental|vacation|host/i,
            'uber': /uber|taxi|ride|driver|transport/i,
            'spotify': /spotify|music|playlist|stream|audio/i,
            'netflix': /netflix|movie|stream|video|watch/i,
            'amazon': /amazon|shop|store|ecommerce|product/i,
            'apple': /apple|minimal|clean|sleek|ios/i,
            'google': /google|material|search|android/i,
            'facebook': /facebook|social|community|network/i,
            'instagram': /instagram|photo|image|gallery|feed/i,
            'twitter': /twitter|tweet|social|feed|news/i,
            'linkedin': /linkedin|professional|business|job|career/i,
            'dribbble': /dribbble|design|creative|portfolio|shot/i,
            'behance': /behance|portfolio|creative|design|project/i,
            'medium': /medium|blog|article|read|story/i,
            'mailchimp': /mailchimp|email|newsletter|marketing|campaign/i,
            'stripe': /stripe|payment|checkout|transaction/i,
            'shopify': /shopify|store|ecommerce|product|sell/i,
            'wordpress': /wordpress|blog|cms|theme|template/i,
            'wix': /wix|website|builder|drag|drop/i,
            'squarespace': /squarespace|portfolio|minimal|elegant/i,

            // ===== PERFORMANCE & TECHNICAL (SEO-related searches) =====
            'fast': /fast|speed|quick|performance|lightweight/i,
            'seo': /seo|search engine|optimization|meta|sitemap/i,
            'accessible': /accessible|accessibility|a11y|wcag|aria/i,
            'mobile-first': /mobile|responsive|adaptive|fluid/i,
            'cross-browser': /browser|chrome|firefox|safari|edge/i,
            'retina': /retina|hdpi|high resolution|crisp|sharp/i,
            'lazy-load': /lazy|defer|async|performance/i,
            'pwa': /pwa|progressive|offline|installable/i,
            'amp': /amp|accelerated|mobile|fast/i,

            // ===== COLORS (from template names) =====
            'blue': /blue|ocean|sky|aqua|azure|navy|sea|water|pacific/i,
            'green': /green|eco|nature|organic|leaf|forest|garden|farm/i,
            'red': /red|crimson|ruby|scarlet|fire/i,
            'orange': /orange|amber|sunset/i,
            'purple': /purple|violet|lavender|magenta/i,
            'yellow': /yellow|gold|golden|sun|bright/i,
            'pink': /pink|rose|blush/i,
            'brown': /brown|wood|coffee|chocolate|earth/i,
            'white': /white|light|bright|clean|minimal/i,
            'black': /black|dark|night|shadow/i,
            'grey': /grey|gray|silver|neutral/i
        };

        // Check name and category against patterns for additional tags
        for (const [tag, pattern] of Object.entries(featurePatterns)) {
            if (pattern.test(nameLower) || pattern.test(keyLower) || pattern.test(categoryLower)) {
                tags.add(tag);
            }
        }

        // Also add words from the template name as tags
        const nameWords = nameLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        nameWords.forEach(word => tags.add(word));

        // Add extracted colors from thumbnail analysis
        if ($colors && $colors[key]) {
            $colors[key].forEach(color => tags.add(color));
        }

        return Array.from(tags).join(' ');
    }

    /**
     * Load products into the grid
     */
    function loadProducts() {
        const fragment = document.createDocumentFragment();
        const totalCount = Object.keys($products).length;

        for (const [key, product] of Object.entries($products)) {
            const anchor = document.createElement('a');
            anchor.className = 'product';
            anchor.dataset.id = key;
            anchor.dataset.name = product.name.toLowerCase();
            anchor.dataset.category = product.tag || 'Other';
            anchor.dataset.tags = generateTags(key, product.name, product.tag || 'Other');
            anchor.href = '#';

            // Use data-src for lazy loading, include favorite button
            const isFavorited = FavoritesManager.isFavorited(key);
            anchor.innerHTML = `
                <button class="favorite-btn ${isFavorited ? 'favorited' : ''}"
                        data-template-id="${key}"
                        title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                    <svg class="heart-icon" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                <img data-src="${product.img}" alt="${product.name}" width="220" height="140">
                <span class="title">${product.name}</span>
                <span class="badge">${product.tag}</span>
            `;

            fragment.appendChild(anchor);
        }

        el.productList.appendChild(fragment);

        // Update template count
        if (el.templateCount) {
            el.templateCount.textContent = `${totalCount} templates available`;
        }

        // Observe all images for lazy loading
        el.productList.querySelectorAll('img[data-src]').forEach(img => {
            lazyObserver.observe(img);
        });
    }

    /**
     * Filter products by search query, category, and color
     * Uses smart matching: scores templates by relevance
     */
    function filterProducts() {
        const searchInput = (el.searchInput?.value || '').toLowerCase().trim();
        const products = el.productList.querySelectorAll('.product');

        // Words that are too common to be useful filters (all templates have these)
        // This includes all universal tags that apply to every template
        const stopWords = new Set([
            // Common filler words
            'and', 'the', 'with', 'for', 'that', 'this', 'from', 'have', 'has',
            // Generic template terms
            'template', 'templates', 'theme', 'themes', 'website', 'web', 'page', 'pages',
            'site', 'design', 'designs', 'download', 'downloads',
            // Technology (all templates have these)
            'bootstrap', 'responsive', 'modern', 'free', 'html', 'html5', 'css', 'css3',
            'mobile-friendly', 'cross-browser', 'w3c-valid', 'well-documented',
            'seo', 'fast', 'retina', 'accessible', 'jquery', 'javascript',
            // UI components (all templates have these)
            'slider', 'carousel', 'slideshow', 'banner', 'hero', 'header',
            'contact-form', 'form', 'contact', 'newsletter', 'email',
            'social', 'icons', 'menu', 'navbar', 'navigation', 'dropdown',
            'footer', 'cards', 'animated', 'gallery', 'grid', 'sections',
            'testimonials', 'team', 'about', 'services', 'features',
            'button', 'buttons', 'cta', 'call-to-action',
            // Design qualities
            'professional', 'clean', 'minimal', 'landing', 'landing-page',
            'one-page', 'multi-page', 'creative', 'beautiful', 'elegant',
            'stylish', 'attractive', 'quality', 'best', 'new', 'latest',
            // Years
            '2024', '2025', '2026',
            // Other common but unhelpful
            'premium', 'free-download'
        ]);

        // Split search into meaningful words (filter out stop words and short words)
        const searchWords = searchInput
            .split(/\s+/)
            .filter(w => w.length > 1 && !stopWords.has(w));

        // Score and collect matching products
        const scoredProducts = [];

        products.forEach(product => {
            const name = product.dataset.name;
            const category = product.dataset.category;
            const tags = product.dataset.tags || '';
            const productId = product.dataset.id;

            // Calculate relevance score
            let score = 0;
            let matchedWords = 0;

            if (searchWords.length === 0) {
                score = 1; // No search = show all
            } else {
                for (const word of searchWords) {
                    // Exact name match = highest score
                    if (name.includes(word)) {
                        score += 10;
                        matchedWords++;
                    }
                    // Category match = high score
                    else if (category.toLowerCase().includes(word)) {
                        score += 8;
                        matchedWords++;
                    }
                    // Tag match = medium score
                    else if (tags.includes(word)) {
                        score += 3;
                        matchedWords++;
                    }
                }

                // Require at least one word to match
                if (matchedWords === 0) {
                    score = 0;
                }

                // Bonus for matching multiple words
                if (matchedWords > 1) {
                    score += matchedWords * 2;
                }

                // Bonus for matching ALL search words
                if (matchedWords === searchWords.length && searchWords.length > 1) {
                    score += 20;
                }
            }

            const matchesCategory = currentCategory === 'All' || category === currentCategory;

            // Color filter
            let matchesColor = currentColor === 'all';
            if (!matchesColor && $colors && $colors[productId]) {
                const productColors = $colors[productId];
                matchesColor = productColors.includes(currentColor);
                if (!matchesColor && currentColor === 'black') {
                    matchesColor = productColors.includes('black') || tags.includes('dark');
                }
            }

            // Store product with score
            scoredProducts.push({
                element: product,
                score: (score > 0 && matchesCategory && matchesColor) ? score : 0,
                productId
            });
        });

        // Sort by score (highest first) and show/hide
        scoredProducts.sort((a, b) => b.score - a.score);

        let visibleCount = 0;
        scoredProducts.forEach(({ element, score }) => {
            if (score > 0) {
                element.classList.remove('hidden');
                visibleCount++;
                const img = element.querySelector('img[data-src]');
                if (img) lazyObserver.observe(img);
            } else {
                element.classList.add('hidden');
            }
        });

        // Reorder DOM to show best matches first (optional, improves UX)
        if (searchWords.length > 0 && visibleCount > 0) {
            const fragment = document.createDocumentFragment();
            scoredProducts
                .filter(p => p.score > 0)
                .forEach(p => fragment.appendChild(p.element));
            scoredProducts
                .filter(p => p.score === 0)
                .forEach(p => fragment.appendChild(p.element));
            el.productList.appendChild(fragment);
        }

        // Update count
        if (el.templateCount) {
            const total = products.length;
            if (searchInput || currentCategory !== 'All' || currentColor !== 'all') {
                el.templateCount.textContent = `${visibleCount} of ${total} templates`;
            } else {
                el.templateCount.textContent = `${total} templates available`;
            }
        }

        // Show no results message
        let noResults = el.productList.querySelector('.no-results');
        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = 'No templates found. Try different keywords.';
                el.productList.appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    /**
     * Set active category
     */
    function setCategory(category) {
        currentCategory = category;

        // Update active button state
        el.categoryFilters?.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Scroll products to top
        if (el.productsWrapper) {
            el.productsWrapper.scrollTop = 0;
        }

        filterProducts();
    }

    /**
     * Set active color filter
     */
    function setColor(color) {
        currentColor = color;

        // Update active swatch state
        el.colorFilters?.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.color === color);
        });

        // Scroll products to top
        if (el.productsWrapper) {
            el.productsWrapper.scrollTop = 0;
        }

        filterProducts();
    }

    /**
     * Set active tab
     */
    function setTab(tabName) {
        if (currentTab === tabName) return;

        currentTab = tabName;

        // Update active tab button
        el.tabNavigation?.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Track tab change
        trackEvent('tab_switch', { tab: tabName });

        // Handle tab-specific logic
        switch (tabName) {
            case 'all':
                filterProducts();
                break;
            case 'favorites':
                showFavorites();
                break;
            case 'popular':
                showPopular();
                break;
        }

        // Scroll products to top
        if (el.productsWrapper) {
            el.productsWrapper.scrollTop = 0;
        }
    }

    /**
     * Show favorites tab
     */
    function showFavorites() {
        const favoriteIds = FavoritesManager.getAll();
        const products = el.productList.querySelectorAll('.product');

        let visibleCount = 0;
        products.forEach(product => {
            const id = product.dataset.id;
            const isFavorite = favoriteIds.includes(id);
            product.classList.toggle('hidden', !isFavorite);
            if (isFavorite) {
                visibleCount++;
                // Re-observe for lazy loading
                const img = product.querySelector('img[data-src]');
                if (img) lazyObserver.observe(img);
            }
        });

        updateTemplateCount(visibleCount, products.length);
        showNoResultsMessage(visibleCount === 0, 'No favorites yet. Click the heart icon on templates to add them.');
    }

    /**
     * Show popular templates tab
     */
    function showPopular() {
        const products = el.productList.querySelectorAll('.product');
        const popularSet = new Set(POPULAR_TEMPLATES);

        let visibleCount = 0;

        // First pass: show/hide products
        products.forEach(product => {
            const id = product.dataset.id;
            const isPopular = popularSet.has(id);
            product.classList.toggle('hidden', !isPopular);
            if (isPopular) {
                visibleCount++;
                // Re-observe for lazy loading
                const img = product.querySelector('img[data-src]');
                if (img) lazyObserver.observe(img);
            }
        });

        // Reorder to match POPULAR_TEMPLATES order
        const fragment = document.createDocumentFragment();
        POPULAR_TEMPLATES.forEach(id => {
            const product = el.productList.querySelector(`[data-id="${id}"]`);
            if (product) fragment.appendChild(product);
        });
        // Append remaining hidden products
        products.forEach(p => {
            if (p.classList.contains('hidden')) fragment.appendChild(p);
        });
        el.productList.appendChild(fragment);

        updateTemplateCount(visibleCount, products.length);
        showNoResultsMessage(visibleCount === 0, 'No popular templates available.');
    }

    /**
     * Update template count display
     */
    function updateTemplateCount(visible, total) {
        if (el.templateCount) {
            if (currentTab === 'all' && currentCategory === 'All' && currentColor === 'all' && !el.searchInput?.value) {
                el.templateCount.textContent = `${total} templates available`;
            } else {
                el.templateCount.textContent = `${visible} of ${total} templates`;
            }
        }
    }

    /**
     * Show or hide no results message
     */
    function showNoResultsMessage(show, message = 'No templates found.') {
        let noResults = el.productList.querySelector('.no-results');

        if (show) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results';
                el.productList.appendChild(noResults);
            }
            noResults.textContent = message;
        } else if (noResults) {
            noResults.remove();
        }
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Viewport buttons
        document.querySelector('.desktop-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            setViewport('100%');
        });

        document.querySelector('.tablet-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            setViewport('768px');
        });

        document.querySelector('.mobile-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            setViewport('480px');
        });

        // Product switcher toggle
        el.productSwitcher?.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSwitcher();
        });

        // Modal close button
        el.modalClose?.addEventListener('click', () => {
            toggleSwitcher();
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && el.body.classList.contains('toggle')) {
                toggleSwitcher();
            }
        });

        // Search input
        if (el.searchInput) {
            let searchTimeout;
            el.searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(filterProducts, 150);
            });
        }

        // Category filter buttons
        el.categoryFilters?.addEventListener('click', (e) => {
            const btn = e.target.closest('.category-btn');
            if (btn) {
                setCategory(btn.dataset.category);
            }
        });

        // Color filter swatches
        el.colorFilters?.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (swatch) {
                setColor(swatch.dataset.color);
            }
        });

        // Tab navigation
        el.tabNavigation?.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (btn && !btn.classList.contains('loading')) {
                setTab(btn.dataset.tab);
            }
        });

        // Product selection and favorite buttons (event delegation)
        el.productList.addEventListener('click', (e) => {
            // Handle favorite button click
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const templateId = favoriteBtn.dataset.templateId;
                FavoritesManager.toggle(templateId);
                return;
            }

            // Handle product selection
            const product = e.target.closest('.product');
            if (!product) return;

            e.preventDefault();
            const id = product.dataset.id;
            if (id in $products) {
                setCurrentProduct(id);
                toggleSwitcher();
            }
        });

        // Header favorites button - toggle current template's favorite status
        document.querySelector('.favorites-btn a')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentProduct && currentProduct in $products) {
                FavoritesManager.toggle(currentProduct);
                updateHeaderFavoriteState();
            }
        });

        // Purchase button - go to template page with pricing anchor
        document.querySelector('.purchase-btn a')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentProduct in $products) {
                const product = $products[currentProduct];
                // Track purchase click in GA4
                trackEvent('purchase_click', {
                    template_id: currentProduct,
                    template_name: product.name,
                    template_category: product.tag || 'Other'
                });
                // Direct to template page with pricing section
                window.top.location.href = `https://colorlib.com/wp/template/${currentProduct}/#pricing`;
            }
        });

        // Remove/close button
        document.querySelector('.remove-btn a')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentProduct in $products) {
                window.top.location.href = $products[currentProduct].url;
            }
        });

        // Iframe load event
        el.productIframe.addEventListener('load', hidePreloader);

        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(calculateIframeHeight, 100);
        });

        window.addEventListener('load', calculateIframeHeight);
    }

    /**
     * Initialize from URL hash or query param
     */
    function initFromURL() {
        let key = getCurrentProductKey();

        // Default to first product if not found
        if (!key) {
            key = Object.keys($products)[0];
        }

        setCurrentProduct(key);
    }

    /**
     * Track event in Google Analytics 4
     */
    function trackEvent(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
        }
    }

    /**
     * Set the current product and update UI
     */
    function setCurrentProduct(id) {
        currentProduct = id;
        const product = $products[id];

        // Update header text
        if (el.productSwitcher) {
            el.productSwitcher.innerHTML = `${product.name} <span class="badge">${product.tag}</span>`;
        }

        // Show preloader
        showPreloader();

        // Load iframe
        el.productIframe.src = product.url;

        // Update URL hash
        history.replaceState(null, '', `#${id}`);

        // Update viewport buttons visibility
        updateViewportButtons(product.responsive !== 0);

        // Update header favorite button state
        updateHeaderFavoriteState();

        // Track template view in GA4
        trackEvent('template_view', {
            template_id: id,
            template_name: product.name,
            template_category: product.tag || 'Other'
        });
    }

    /**
     * Toggle the product switcher modal
     */
    function toggleSwitcher() {
        el.body.classList.toggle('toggle');

        if (el.body.classList.contains('toggle')) {
            // Pre-select the current template's category to show related templates first
            if (currentProduct in $products) {
                const currentTemplateCategory = $products[currentProduct].tag || 'Other';
                setCategory(currentTemplateCategory);
            }
            // Focus search input when opening
            if (el.searchInput) {
                setTimeout(() => el.searchInput.focus(), 100);
            }
            // Scroll products wrapper to top
            if (el.productsWrapper) {
                el.productsWrapper.scrollTop = 0;
            }
        } else {
            // Clear search and reset filters when closing
            if (el.searchInput) {
                el.searchInput.value = '';
            }
            setCategory('All');
            setColor('all');
            // Reset to 'all' tab
            currentTab = 'all';
            el.tabNavigation?.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === 'all');
            });
        }
    }

    /**
     * Set iframe viewport width
     */
    function setViewport(width) {
        el.productIframe.style.width = width;
    }

    /**
     * Update viewport buttons visibility
     */
    function updateViewportButtons(enabled) {
        if (enabled) {
            el.body.classList.remove('viewport-disabled');
        } else {
            el.body.classList.add('viewport-disabled');
            setViewport('100%');
        }
    }

    /**
     * Update header favorite button state for current template
     */
    function updateHeaderFavoriteState() {
        const headerFavBtn = document.querySelector('.favorites-btn');
        if (headerFavBtn && currentProduct) {
            const isFav = FavoritesManager.isFavorited(currentProduct);
            headerFavBtn.classList.toggle('is-favorited', isFav);
        }
    }

    /**
     * Calculate and set iframe height
     */
    function calculateIframeHeight() {
        const windowHeight = window.innerHeight;
        const barHeight = el.switcherBar?.offsetHeight || 60;
        const iframeHeight = windowHeight - barHeight - 2;

        el.productIframe.style.height = `${iframeHeight}px`;
    }

    /**
     * Show the preloader
     */
    function showPreloader() {
        if (el.preloader) {
            el.preloader.style.display = 'block';
            el.preloader.style.opacity = '1';
        }
    }

    /**
     * Hide the preloader with fade
     */
    function hidePreloader() {
        if (el.preloader) {
            el.preloader.style.transition = 'opacity 0.4s';
            el.preloader.style.opacity = '0';
            setTimeout(() => {
                el.preloader.style.display = 'none';
            }, 400);
        }
    }

    // Public API
    return { init };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TemplateSwitcher.init);
} else {
    TemplateSwitcher.init();
}
