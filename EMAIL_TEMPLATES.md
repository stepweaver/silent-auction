## Bid confirmation

- **Subject**: `✅ Bid received: {{itemTitle}}`
- **Preheader**: `We’ve received your bid on “{{itemTitle}}”. You can increase it any time before close.`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <!-- hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    We’ve received your bid on “{{itemTitle}}”. You can increase it any time before close.
  </div>

  <!-- optional logo -->
  <!-- replace {{logoUrl}} with your hosted logo URL, or remove this block -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #047857; margin-bottom: 8px;">Bid received 🎉</h2>
  <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">Hi {{bidderName}},</p>
  <p style="font-size: 15px; line-height: 1.5;">
    Thanks for placing a bid in the Mary Frank PTO auction.
  </p>

  <p style="font-size: 14px; line-height: 1.5;">
    <strong>Item:</strong> {{itemTitle}}
  </p>

  <p style="font-size: 18px; font-weight: bold; color: #047857;">
    Your bid: ${{bidAmount}}
  </p>

  <p style="font-size: 14px; line-height: 1.5; margin-top: 12px;">
    You can increase your bid any time before this item closes. You can always check your status on the
    item page or in your dashboard to see whether you're still the high bidder.
  </p>

  <p>
    <a href="{{itemUrl}}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
      View item
    </a>
  </p>

  <!-- optional security note -->
  <p style="margin-top: 20px; font-size: 14px; color: #555;">
    If you did not place this bid, please contact the auction administrator immediately at
    <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
  </p>

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    <br />
    Questions? Contact
    <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
  </p>
</div>
```

**Text**

```text
Bid received for "{{itemTitle}}"

Hi {{bidderName}},

Thanks for placing a bid in the Mary Frank PTO auction.
Item: {{itemTitle}}
Your bid: ${{bidAmount}}

You can increase your bid any time before this item closes. You can always check your status on the
item page or in your dashboard to see whether you're still the high bidder.

View item: {{itemUrl}}

If you did not place this bid, contact the auction administrators immediately at {{contactEmail}}.
```

---

## Winner digest (single or multiple items)

- **Subject**: `🎉 You won: {{subjectItems}}`
  - `{{subjectItems}}` is either the single item title or `"N items"`.
- **Preheader**:  
  `Thank you for supporting Mary Frank PTO — here’s a summary of the item(s) you won.`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <!-- hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Thank you for supporting Mary Frank PTO — here’s a summary of the item{{pluralSuffix}} you won.
  </div>

  <!-- optional logo -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #047857; margin-bottom: 8px;">
    You won{{#if bidderName}}, {{bidderName}}{{/if}}! 🎉
  </h2>

  <p style="font-size: 15px; line-height: 1.5;">
    Thank you for supporting Mary Frank PTO — our students and staff are grateful.
    You won the following item{{pluralSuffix}}:
  </p>

  <div style="margin: 20px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background: #eff6ff;">
        <tr>
          <th style="padding: 12px; text-align: left; font-size: 13px; color: #1f2937;">Item</th>
          <th style="padding: 12px; text-align: right; font-size: 13px; color: #1f2937;">Winning Bid</th>
          <th style="padding: 12px; text-align: right; font-size: 13px; color: #1f2937;">Details</th>
        </tr>
      </thead>
      <tbody>
        <!-- repeat for each won item -->
        {{#each items}}
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">{{itemTitle}}</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">
            ${{winningBid}}
          </td>
          <td style="padding: 12px; text-align: right;">
            {{#if itemUrl}}
            <a href="{{itemUrl}}" style="color: #047857; text-decoration: none; font-weight: 600;">View item →</a>
            {{/if}}
          </td>
        </tr>
        {{/each}}
      </tbody>
      <tfoot style="background: #f3f4f6;">
        <tr>
          <td style="padding: 12px; text-align: right; font-weight: bold;" colspan="2">Total Due:</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">${{totalAmount}}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div style="margin: 24px 0; padding: 20px; background: #ecfdf5; border-radius: 12px;">
    <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #047857;">Next Steps</h3>
    {{#if paymentInstructions}}
    <p style="margin: 0 0 12px 0;">
      <strong>Payment:</strong> {{paymentInstructions}}
    </p>
    {{/if}}
    {{#if pickupInstructions}}
    <p style="margin: 0;">
      <strong>Pickup:</strong> {{pickupInstructions}}
    </p>
    {{/if}}
    {{#if paymentInstructionsUrl}}
    <p style="margin: 16px 0 0 0;">
      <a href="{{paymentInstructionsUrl}}" style="display: inline-block; padding: 12px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
        View Payment Instructions
      </a>
    </p>
    {{/if}}
    <p style="margin: 12px 0 0 0; font-size: 13px; color: #4b5563;">
      Please complete payment within <strong>24 hours</strong> of the auction closing and before picking up your item{{pluralSuffix}}. Administrators will confirm payment before releasing any items. After that window, the auction team may offer unpaid items to the next highest bidder.
    </p>
  </div>

  <p style="font-size: 14px; color: #4b5563;">
    If you have any questions,
    {{#if contactEmail}}
      please contact us at
      <a href="mailto:{{contactEmail}}" style="color: #047857;">{{contactEmail}}</a>.
    {{else}}
      please reach out to the auction administrators.
    {{/if}}
  </p>

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    {{#if contactEmail}}
    <br />
    Questions? Contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
    {{/if}}
  </p>
</div>
```

**Text**

```text
You won{{#if bidderName}}, {{bidderName}}{{/if}}!

Thank you for supporting Mary Frank PTO — our students and staff are grateful.
You won the following item{{pluralSuffix}}:

{{#each items}}
• {{itemTitle}}: ${{winningBid}}{{#if itemUrl}} ({{itemUrl}}){{/if}}
{{/each}}

Total Due: ${{totalAmount}}

{{#if paymentInstructions}}
Payment: {{paymentInstructions}}
{{/if}}

{{#if pickupInstructions}}
Pickup: {{pickupInstructions}}
{{/if}}

{{#if paymentInstructionsUrl}}
View Payment Instructions: {{paymentInstructionsUrl}}
{{/if}}

Please complete payment within 24 hours of the auction closing and before picking up your item{{pluralSuffix}}. Administrators will confirm payment before releasing any items. After that window, the auction team may offer unpaid items to the next highest bidder.

{{#if contactEmail}}
Questions? Contact {{contactEmail}}
{{/if}}
```

---

## Donation pledge confirmation

- **Subject**: `💚 Thank you for your donation pledge — ${{amount}}`
- **Preheader**:  
  `Thank you for supporting Mary Frank PTO — pledge received for ${{amount}}.`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <!-- hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Thank you for supporting Mary Frank PTO — pledge received for ${{amount}}.
  </div>

  <!-- optional logo -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #047857; margin-bottom: 8px;">Thank you, {{donorName}}! 💚</h2>

  <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">
    We just received your donation pledge, and it truly means a lot.
    Your support helps Mary Frank students and staff — thank you for showing up for our school.
  </p>
  <p style="font-size: 15px; line-height: 1.5;">
    Thank you again for your generosity.
  </p>

  <div style="margin: 16px 0; padding: 16px; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 12px;">
    <div style="font-size: 13px; color: #065f46; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
      Donation pledge received
    </div>
    <div style="font-size: 22px; font-weight: 800; color: #047857;">
      ${{amount}}
    </div>
  </div>

  {{#if message}}
  <div style="margin-top: 12px; padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 6px;">
      Your note
    </div>
    <div style="font-style: italic;">
      “{{message}}”
    </div>
  </div>
  {{/if}}

  {{#if donationPaymentUrl}}
  <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px;">
    <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af;">
      If you haven't completed your payment yet, please click the link below to pay now — we really appreciate it.
    </p>
    <a href="{{donationPaymentUrl}}" style="display: inline-block; padding: 12px 18px; background: #047857; color: white; text-decoration: none; border-radius: 10px; font-weight: 700;">
      Pay pledge online
    </a>
    <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
      If you prefer, you can also pay using the methods provided by the auction team.
    </p>
  </div>
  {{else}}
  <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px;">
    <p style="margin: 0; font-size: 14px; color: #1e40af;">
      Next steps: the auction team will reconcile pledges after the event and will share payment details if anything is needed.
    </p>
  </div>
  {{/if}}

  <p style="font-size: 14px; color: #4b5563; margin-top: 18px;">
    With gratitude,<br />
    <strong>Mary Frank PTO</strong>
  </p>

  {{#if contactEmail}}
  <p style="margin-top: 8px; font-size: 14px; color: #555;">
    Questions? Contact us at
    <a href="mailto:{{contactEmail}}" style="color:#047857;">{{contactEmail}}</a>.
  </p>
  {{/if}}

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    {{#if contactEmail}}
    <br />
    Questions? Contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
    {{/if}}
  </p>
</div>
```

**Text**

```text
Thank you, {{donorName}}!

We received your donation pledge — and we genuinely appreciate it.
Your support helps Mary Frank students and staff. Thank you for showing up for our school.
Thank you again for your generosity.

Pledge amount: ${{amount}}

{{#if message}}
Your note: "{{message}}"
{{/if}}

{{#if donationPaymentUrl}}
If you haven't completed your payment yet, please click the link below to pay now — we really appreciate it.
{{donationPaymentUrl}}
If you prefer, you can also pay using the methods provided by the auction team.
{{else}}
Next steps: the auction team will reconcile pledges after the event and will share payment details if anything is needed.
{{/if}}

{{#if contactEmail}}
Questions? Contact {{contactEmail}}
{{/if}}

With gratitude,
Mary Frank PTO
```

---

## Alias access security alert

- **Subject**: `Security Alert: Silent Auction Alias Access`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- optional logo -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #dc2626;">Security Alert: Silent Auction Alias Access</h2>

  <p>Hello,</p>

  <p>
    Someone has accessed or attempted to access your Silent Auction alias using this email address
    (<strong>{{email}}</strong>).
  </p>

  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-weight: bold; color: #dc2626;">
      Your Alias: {{alias}}
    </p>
  </div>

  <p>
    <strong>If this was you:</strong>
    You can safely ignore this message. You may have cleared your browser data, switched devices,
    or are accessing the auction from a new location.
  </p>

  <p style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
    <strong style="color: #d97706;">If this was NOT you:</strong>
    Please contact the auction administrators immediately at
    <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>
    to report unauthorized access.
  </p>

  {{#if siteUrl}}
  <p>
    <a href="{{siteUrl}}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
      View Auction
    </a>
  </p>
  {{/if}}

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    {{#if contactEmail}}
    <br />
    Questions? Contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
    {{/if}}
  </p>
</div>
```

**Text**

```text
Security Alert: Silent Auction Alias Access

Hello,

Someone has accessed or attempted to access your Silent Auction alias using this email address ({{email}}).

Your Alias: {{alias}}

If this was you: You can safely ignore this message. You may have cleared your browser data, switched devices,
or are accessing the auction from a new location.

If this was NOT you: Please contact the auction administrators immediately at {{contactEmail}} to report unauthorized access.

{{#if siteUrl}}
View Auction: {{siteUrl}}
{{/if}}
```

---

## Donor enrollment (vendor admin)

- **Subject**: `Welcome! Access Your Donor Dashboard`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- optional logo -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #333;">Welcome as a Donor!</h2>

  <p>Hello {{name}},</p>

  <p>
    Thank you for donating to the Mary Frank PTO Silent Auction! We're excited and grateful to have your support.
  </p>

  <p>
    Your donor account has been set up. Click the link below to access your donor dashboard where you can add and manage your items.
  </p>

  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 16px 0; font-weight: bold;">Click the button below to access your dashboard:</p>
    <a href="{{enrollmentLink}}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Access Dashboard
    </a>
  </div>

  <p style="font-size: 14px; color: #555;">
    Or copy and paste this link into your browser:
  </p>

  <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">
    {{enrollmentLink}}
  </p>

  <p style="margin-top: 20px; font-size: 14px; color: #555;">You'll be able to:</p>
  <ul style="font-size: 14px; color: #555;">
    <li>Add your donated items with photos and descriptions</li>
    <li>Set starting prices</li>
    <li>View and manage all your items in one place</li>
  </ul>

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    {{#if contactEmail}}
    <br />
    Questions? Contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
    {{/if}}
  </p>
</div>
```

**Text**

```text
Welcome as a Donor!

Hello {{name}},

Thank you for donating to our silent auction! We're excited to have your items in the auction.

Your donor account has been set up. Click the link below to access your donor dashboard where you can add and manage your donated items:

{{enrollmentLink}}

You'll be able to:
- Add your donated items with photos and descriptions
- Set starting prices
- View and manage all your items in one place

{{#if contactEmail}}
Questions? Contact {{contactEmail}}
{{/if}}
```

---

## Email verification

- **Subject**: `Verify Your Email Address - Silent Auction`
- **Preheader**:  
  `Confirm your email to start bidding in the Mary Frank PTO silent auction.`

**HTML**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Confirm your email to start bidding in the Mary Frank PTO silent auction.
  </div>

  <!-- optional logo -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="{{logoUrl}}" alt="Mary Frank PTO" style="max-height:48px" />
  </div>

  <h2 style="color: #333;">Verify Your Email Address</h2>

  <p>Hello {{name}},</p>

  <p>
    Thank you for registering for the silent auction! To complete your registration and start bidding,
    please verify your email address by clicking the button below.
  </p>

  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 16px 0; font-weight: bold;">
      Click the button below to verify your email:
    </p>
    <a href="{{verificationLink}}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Verify Email Address
    </a>
  </div>

  <p style="font-size: 14px; color: #555;">
    Or copy and paste this link into your browser:
  </p>

  <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">
    {{verificationLink}}
  </p>

  <p style="margin-top: 20px; font-size: 14px; color: #555;">
    This verification link will expire in 24 hours.
  </p>

  <p style="font-size: 14px; color: #555;">
    If you didn't register for this auction, you can safely ignore this email.
  </p>

  <p style="margin-top: 24px; font-size: 12px; color: #666;">
    Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.
    {{#if contactEmail}}
    <br />
    Questions? Contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.
    {{/if}}
  </p>
</div>
```

**Text**

```text
Verify Your Email Address

Hello {{name}},

Thank you for registering for the silent auction! To complete your registration and start bidding,
please verify your email address by clicking the link below:

{{verificationLink}}

This verification link will expire in 24 hours.

If you didn't register for this auction, you can safely ignore this email.

{{#if contactEmail}}
Questions? Contact {{contactEmail}}
{{/if}}
```

