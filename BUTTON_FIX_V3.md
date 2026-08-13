# Place Order button fix V3

- Removed the document-level pointer/touch arming guard that could reject a real Android button tap after the keyboard resized the page.
- The customer modal now places an order only from a direct pointer/touch release on the orange `Place Order` button.
- Enter/Go/Arrow on the mobile keyboard is still blocked from submitting.
- Tapping outside the button, dismissing the keyboard, blur/focus changes, or touching empty modal space cannot place an order.
