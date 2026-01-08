
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try the modern API first
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err: any) {
        // Only log warning if it's not a permission/policy issue (common in iframes)
        if (err.name !== 'NotAllowedError' && !err.message?.includes('permissions policy')) {
          console.warn('Clipboard API failed, using fallback:', err);
        }
      }
    }
  
  // Robust Fallback using execCommand
  try {
    if (typeof document === 'undefined') return false;
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure the textarea is not visible but part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', ''); // Prevent keyboard on mobile
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}
