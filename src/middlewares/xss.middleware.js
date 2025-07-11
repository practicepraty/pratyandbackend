import xss from 'xss-clean';
import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

// Create a window object for DOMPurify
const window = new JSDOM('').window;
const purifier = DOMPurify(window);

// XSS Protection configuration
const xssConfig = {
  whiteList: {
    // Allow only safe HTML tags for rich text content
    p: ['class', 'style'],
    br: [],
    strong: [],
    em: [],
    u: [],
    h1: ['class'],
    h2: ['class'],
    h3: ['class'],
    h4: ['class'],
    h5: ['class'],
    h6: ['class'],
    ul: ['class'],
    ol: ['class'],
    li: ['class']
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  allowCommentTag: false,
  stripBlankChar: true,
  css: {
    whiteList: {
      'color': true,
      'background-color': true,
      'font-size': true,
      'font-weight': true,
      'text-align': true,
      'margin': true,
      'padding': true
    }
  }
};

// Enhanced XSS sanitization
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove dangerous patterns
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/livescript:/gi, '')
      .replace(/mocha:/gi, '')
      .replace(/data:application\/x-javascript/gi, '')
      .replace(/data:application\/javascript/gi, '')
      .replace(/expression\(/gi, '')
      .replace(/eval\(/gi, '')
      .replace(/setTimeout\(/gi, '')
      .replace(/setInterval\(/gi, '')
      .replace(/Function\(/gi, '')
      .replace(/XMLHttpRequest/gi, '')
      .replace(/ActiveXObject/gi, '')
      .replace(/document\.cookie/gi, '')
      .replace(/document\.write/gi, '')
      .replace(/window\.location/gi, '')
      .replace(/document\.location/gi, '')
      .replace(/location\.href/gi, '')
      .replace(/location\.replace/gi, '')
      .replace(/location\.reload/gi, '')
      .replace(/history\.pushState/gi, '')
      .replace(/history\.replaceState/gi, '')
      .replace(/window\.open/gi, '')
      .replace(/alert\(/gi, '')
      .replace(/confirm\(/gi, '')
      .replace(/prompt\(/gi, '')
      .replace(/console\./gi, '')
      .replace(/import\(/gi, '')
      .replace(/require\(/gi, '')
      .replace(/process\./gi, '')
      .replace(/__dirname/gi, '')
      .replace(/__filename/gi, '')
      .replace(/global\./gi, '')
      .replace(/this\./gi, '')
      .replace(/prototype\./gi, '')
      .replace(/constructor/gi, '')
      .replace(/innerHTML/gi, '')
      .replace(/outerHTML/gi, '')
      .replace(/insertAdjacentHTML/gi, '')
      .replace(/createContextualFragment/gi, '')
      .replace(/DOMParser/gi, '')
      .replace(/XMLSerializer/gi, '')
      .replace(/Range/gi, '')
      .replace(/Selection/gi, '')
      .replace(/getSelection/gi, '')
      .replace(/execCommand/gi, '')
      .replace(/designMode/gi, '')
      .replace(/contentEditable/gi, '')
      .replace(/srcdoc/gi, '')
      .replace(/sandbox/gi, '')
      .replace(/allow-scripts/gi, '')
      .replace(/allow-same-origin/gi, '')
      .replace(/allow-forms/gi, '')
      .replace(/allow-pointer-lock/gi, '')
      .replace(/allow-popups/gi, '')
      .replace(/allow-presentation/gi, '')
      .replace(/allow-top-navigation/gi, '')
      .replace(/formaction/gi, '')
      .replace(/autofocus/gi, '')
      .replace(/autoplay/gi, '')
      .replace(/controls/gi, '')
      .replace(/defer/gi, '')
      .replace(/async/gi, '')
      .replace(/download/gi, '')
      .replace(/hidden/gi, '')
      .replace(/loop/gi, '')
      .replace(/muted/gi, '')
      .replace(/multiple/gi, '')
      .replace(/open/gi, '')
      .replace(/readonly/gi, '')
      .replace(/reversed/gi, '')
      .replace(/selected/gi, '')
      .replace(/autoplay/gi, '')
      .replace(/controls/gi, '')
      .replace(/crossorigin/gi, '')
      .replace(/integrity/gi, '')
      .replace(/nonce/gi, '')
      .replace(/referrerpolicy/gi, '')
      .replace(/rel/gi, '')
      .replace(/sizes/gi, '')
      .replace(/srcset/gi, '')
      .replace(/usemap/gi, '')
      .replace(/ismap/gi, '')
      .replace(/coords/gi, '')
      .replace(/shape/gi, '')
      .replace(/ping/gi, '')
      .replace(/download/gi, '')
      .replace(/hreflang/gi, '')
      .replace(/media/gi, '')
      .replace(/type/gi, '')
      .replace(/charset/gi, '')
      .replace(/content/gi, '')
      .replace(/http-equiv/gi, '')
      .replace(/name/gi, '')
      .replace(/scheme/gi, '')
      .replace(/accept/gi, '')
      .replace(/accept-charset/gi, '')
      .replace(/accesskey/gi, '')
      .replace(/action/gi, '')
      .replace(/align/gi, '')
      .replace(/alink/gi, '')
      .replace(/alt/gi, '')
      .replace(/archive/gi, '')
      .replace(/axis/gi, '')
      .replace(/background/gi, '')
      .replace(/bgcolor/gi, '')
      .replace(/border/gi, '')
      .replace(/cellpadding/gi, '')
      .replace(/cellspacing/gi, '')
      .replace(/char/gi, '')
      .replace(/charoff/gi, '')
      .replace(/charset/gi, '')
      .replace(/checked/gi, '')
      .replace(/cite/gi, '')
      .replace(/class/gi, '')
      .replace(/classid/gi, '')
      .replace(/clear/gi, '')
      .replace(/code/gi, '')
      .replace(/codebase/gi, '')
      .replace(/codetype/gi, '')
      .replace(/color/gi, '')
      .replace(/cols/gi, '')
      .replace(/colspan/gi, '')
      .replace(/compact/gi, '')
      .replace(/content/gi, '')
      .replace(/coords/gi, '')
      .replace(/data/gi, '')
      .replace(/datetime/gi, '')
      .replace(/declare/gi, '')
      .replace(/dir/gi, '')
      .replace(/disabled/gi, '')
      .replace(/enctype/gi, '')
      .replace(/face/gi, '')
      .replace(/for/gi, '')
      .replace(/frame/gi, '')
      .replace(/frameborder/gi, '')
      .replace(/headers/gi, '')
      .replace(/height/gi, '')
      .replace(/href/gi, '')
      .replace(/hspace/gi, '')
      .replace(/id/gi, '')
      .replace(/lang/gi, '')
      .replace(/language/gi, '')
      .replace(/link/gi, '')
      .replace(/longdesc/gi, '')
      .replace(/marginheight/gi, '')
      .replace(/marginwidth/gi, '')
      .replace(/maxlength/gi, '')
      .replace(/method/gi, '')
      .replace(/multiple/gi, '')
      .replace(/nohref/gi, '')
      .replace(/noresize/gi, '')
      .replace(/noshade/gi, '')
      .replace(/nowrap/gi, '')
      .replace(/object/gi, '')
      .replace(/onblur/gi, '')
      .replace(/onchange/gi, '')
      .replace(/onclick/gi, '')
      .replace(/ondblclick/gi, '')
      .replace(/onfocus/gi, '')
      .replace(/onkeydown/gi, '')
      .replace(/onkeypress/gi, '')
      .replace(/onkeyup/gi, '')
      .replace(/onload/gi, '')
      .replace(/onmousedown/gi, '')
      .replace(/onmousemove/gi, '')
      .replace(/onmouseout/gi, '')
      .replace(/onmouseover/gi, '')
      .replace(/onmouseup/gi, '')
      .replace(/onreset/gi, '')
      .replace(/onselect/gi, '')
      .replace(/onsubmit/gi, '')
      .replace(/onunload/gi, '')
      .replace(/profile/gi, '')
      .replace(/prompt/gi, '')
      .replace(/readonly/gi, '')
      .replace(/rules/gi, '')
      .replace(/scheme/gi, '')
      .replace(/scope/gi, '')
      .replace(/scrolling/gi, '')
      .replace(/selected/gi, '')
      .replace(/shape/gi, '')
      .replace(/size/gi, '')
      .replace(/span/gi, '')
      .replace(/src/gi, '')
      .replace(/standby/gi, '')
      .replace(/start/gi, '')
      .replace(/style/gi, '')
      .replace(/summary/gi, '')
      .replace(/tabindex/gi, '')
      .replace(/target/gi, '')
      .replace(/text/gi, '')
      .replace(/title/gi, '')
      .replace(/usemap/gi, '')
      .replace(/valign/gi, '')
      .replace(/value/gi, '')
      .replace(/valuetype/gi, '')
      .replace(/version/gi, '')
      .replace(/vlink/gi, '')
      .replace(/vspace/gi, '')
      .replace(/width/gi, '')
      .replace(/wrap/gi, '')
      .replace(/xmlns/gi, '');
      
    // Use DOMPurify for additional sanitization
    sanitized = purifier.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      FORCE_BODY: false,
      SAFE_FOR_TEMPLATES: true
    });
    
    return sanitized;
  }
  
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeInput);
    }
    
    const sanitized = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
};

// Enhanced XSS protection middleware
export const xssProtection = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeInput(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeInput(req.params);
    }
    
    // Sanitize headers (only specific ones)
    const dangerousHeaders = ['user-agent', 'referer', 'origin'];
    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        req.headers[header] = sanitizeInput(req.headers[header]);
      }
    });
    
    next();
  } catch (error) {
    console.error('XSS Protection Error:', error);
    res.status(400).json({
      error: 'Request contains potentially dangerous content',
      code: 'XSS_PROTECTION_TRIGGERED'
    });
  }
};

// Content Security Policy middleware
export const contentSecurityPolicy = (req, res, next) => {
  const csp = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
    'font-src': ["'self'", 'fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': []
  };
  
  const cspString = Object.entries(csp)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  res.setHeader('Content-Security-Policy', cspString);
  next();
};

// Safe HTML rendering for rich text content
export const sanitizeRichText = (html) => {
  return purifier.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    FORCE_BODY: false,
    SAFE_FOR_TEMPLATES: true
  });
};

// Input validation for specific contexts
export const validateHtmlInput = (input, context = 'text') => {
  if (typeof input !== 'string') {
    return input;
  }
  
  switch (context) {
    case 'text':
      return sanitizeInput(input);
    
    case 'richtext':
      return sanitizeRichText(input);
    
    case 'url':
      try {
        const url = new URL(input);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid URL protocol');
        }
        return url.toString();
      } catch {
        throw new Error('Invalid URL format');
      }
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        throw new Error('Invalid email format');
      }
      return input.toLowerCase();
    
    case 'filename':
      return input.replace(/[^a-zA-Z0-9._-]/g, '');
    
    default:
      return sanitizeInput(input);
  }
};

// DOM-based XSS protection
export const domXssProtection = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (typeof data === 'string') {
      // Sanitize response data to prevent DOM-based XSS
      data = data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      data = data.replace(/javascript:/gi, '');
      data = data.replace(/on\w+=/gi, '');
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Anti-XSS headers
export const antiXssHeaders = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Export the enhanced XSS protection middleware
export default xssProtection;