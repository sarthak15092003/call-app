/**
 * Phone Number Normalization and Validation Utility
 * Supports international dialing codes while preserving E.164 format.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // E.164 (e.g., +919876543210)
  displayFormatted: string; // e.g. +91 98765 43210
  countryCode: string;
  error?: string;
}

export function validateAndNormalizePhone(rawPhone: string | number | undefined | null): PhoneValidationResult {
  if (!rawPhone) {
    return {
      isValid: false,
      normalized: '',
      displayFormatted: '',
      countryCode: '',
      error: 'Phone number is required',
    };
  }

  let cleaned = String(rawPhone).trim();

  // Remove whitespace, dashes, parentheses, dots
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');

  let countryCode = '+91'; // default Indian prefix
  let numberDigits = '';

  if (cleaned.startsWith('+')) {
    // Has international prefix
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return { isValid: false, normalized: cleaned, displayFormatted: cleaned, countryCode: '', error: 'Contains non-numeric characters' };
    }

    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { isValid: false, normalized: cleaned, displayFormatted: cleaned, countryCode: '', error: 'Invalid international length (must be 7-15 digits)' };
    }

    // Identify standard country codes
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      countryCode = '+91';
      numberDigits = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      countryCode = '+1';
      numberDigits = digitsOnly.slice(1);
    } else if (digitsOnly.startsWith('44') && digitsOnly.length >= 11) {
      countryCode = '+44';
      numberDigits = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('971')) {
      countryCode = '+971';
      numberDigits = digitsOnly.slice(3);
    } else {
      countryCode = '+' + digitsOnly.slice(0, 3);
      numberDigits = digitsOnly.slice(3);
    }

    return {
      isValid: true,
      normalized: `+${digitsOnly}`,
      displayFormatted: `${countryCode} ${numberDigits}`,
      countryCode,
    };
  }

  // Without leading '+', check if it has leading '00'
  if (cleaned.startsWith('00')) {
    const digits = cleaned.slice(2);
    return validateAndNormalizePhone('+' + digits);
  }

  // Without leading '+'
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, normalized: cleaned, displayFormatted: cleaned, countryCode: '', error: 'Contains non-numeric characters' };
  }

  // If starts with 0 (e.g. 09876543210 standard Indian landline/mobile dialling)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // 10-digit mobile number (standard Indian)
  if (cleaned.length === 10) {
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        isValid: false,
        normalized: cleaned,
        displayFormatted: cleaned,
        countryCode: '+91',
        error: 'Standard 10-digit Indian mobile numbers must start with 6, 7, 8, or 9',
      };
    }
    return {
      isValid: true,
      normalized: `+91${cleaned}`,
      displayFormatted: `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`,
      countryCode: '+91',
    };
  }

  // 12-digit Indian number starting with 91 (e.g. 919876543210)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const sub = cleaned.slice(2);
    if (!/^[6-9]\d{9}$/.test(sub)) {
      return {
        isValid: false,
        normalized: `+${cleaned}`,
        displayFormatted: `+${cleaned}`,
        countryCode: '+91',
        error: 'Invalid mobile subscriber digits',
      };
    }
    return {
      isValid: true,
      normalized: `+${cleaned}`,
      displayFormatted: `+91 ${sub.slice(0, 5)} ${sub.slice(5)}`,
      countryCode: '+91',
    };
  }

  // General 7-15 digits fallback
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    return {
      isValid: true,
      normalized: `+${cleaned}`,
      displayFormatted: `+${cleaned}`,
      countryCode: '+',
    };
  }

  return {
    isValid: false,
    normalized: cleaned,
    displayFormatted: cleaned,
    countryCode: '',
    error: `Invalid phone length (${cleaned.length} digits). Expecting 10-15 digits.`,
  };
}

