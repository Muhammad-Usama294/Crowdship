import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendKYCApprovalEmail(userEmail: string, userName: string) {
    try {
        await resend.emails.send({
            from: 'CrowdShip <onboarding@resend.dev>', // Update with your verified domain
            to: userEmail,
            subject: '✅ Your KYC Verification is Approved!',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 KYC Approved!</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! Your identity verification has been <strong style="color: #10b981;">approved</strong>. 
            You now have full access to all CrowdShip features, including Traveler mode.
        </p>
        
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">✓ You can now:</p>
            <ul style="margin: 10px 0 0 0; color: #065f46;">
                <li>Switch to Traveler mode</li>
                <li>Accept and deliver shipments</li>
                <li>Earn money by helping others</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/traveler/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Go to Dashboard →
            </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Thank you for being a part of CrowdShip!<br>
            <strong>The CrowdShip Team</strong>
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</body>
</html>
            `,
        })

        console.log('✅ KYC approval email sent to:', userEmail)
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to send KYC approval email:', error)
        return { success: false, error }
    }
}

export async function sendKYCRejectionEmail(userEmail: string, userName: string, rejectionReason: string) {
    try {
        await resend.emails.send({
            from: 'CrowdShip <onboarding@resend.dev>', // Update with your verified domain
            to: userEmail,
            subject: '⚠️ KYC Verification Requires Attention',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Action Required</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            We've reviewed your KYC submission and unfortunately, we need you to resubmit your documents.
        </p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">Reason for rejection:</p>
            <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${rejectionReason}"</p>
        </div>
        
        <p style="font-size: 16px; margin: 20px 0;">
            Please review the feedback above and upload new documents that address the issue. 
            We're here to help you get verified!
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/kyc/upload" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Re-submit Documents →
            </a>
        </div>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">Tips for a successful verification:</p>
            <ul style="margin: 0; color: #6b7280; font-size: 14px;">
                <li>Ensure documents are clear and all text is readable</li>
                <li>Make sure your photo ID is valid and not expired</li>
                <li>Document should show your full name clearly</li>
                <li>Upload high-quality scans or photos</li>
            </ul>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Need help? Reply to this email or contact our support team.<br>
            <strong>The CrowdShip Team</strong>
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated message from CrowdShip.</p>
    </div>
</body>
</html>
            `,
        })

        console.log('✅ KYC rejection email sent to:', userEmail)
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to send KYC rejection email:', error)
        return { success: false, error }
    }
}

export async function sendShipmentReleasedEmail(
    senderEmail: string,
    senderName: string,
    shipmentTitle: string,
    shipmentId: string
) {
    try {
        await resend.emails.send({
            from: 'CrowdShip <onboarding@resend.dev>', // Update with your verified domain
            to: senderEmail,
            subject: '📦 Your Shipment is Available Again',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📦 Shipment Update</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${senderName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            Your shipment <strong>"${shipmentTitle}"</strong> has been released and is now available for other travelers to accept.
        </p>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">What happened?</p>
            <p style="margin: 0; color: #1e3a8a;">
                The traveler who accepted your shipment has modified or cancelled their trip. 
                Your package is now back in the marketplace and available for other travelers to pick up.
            </p>
        </div>
        
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">✓ Good news:</p>
            <ul style="margin: 10px 0 0 0; color: #065f46;">
                <li>No action needed from you</li>
                <li>Your shipment details remain unchanged</li>
                <li>Other travelers can now accept it</li>
                <li>You'll be notified when someone accepts it</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sender/dashboard" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                View Dashboard →
            </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Thank you for using CrowdShip!<br>
            <strong>The CrowdShip Team</strong>
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</body>
</html>
            `,
        })

        console.log('✅ Shipment released email sent to:', senderEmail)
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to send shipment released email:', error)
        return { success: false, error }
    }
}

export async function sendShipmentCancelledToTravelerEmail(
    travelerEmail: string,
    travelerName: string,
    shipmentTitle: string,
    shipmentId: string
) {
    try {
        await resend.emails.send({
            from: 'CrowdShip <onboarding@resend.dev>', // Update with your verified domain
            to: travelerEmail,
            subject: '⚠️ Shipment Cancelled by Sender',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Shipment Cancelled</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${travelerName},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            The sender has cancelled the shipment <strong>"${shipmentTitle}"</strong> that you had accepted.
        </p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">What happened?</p>
            <p style="margin: 0; color: #7f1d1d;">
                The sender decided to cancel this shipment. It has been removed from your current trip.
            </p>
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">ℹ️ What you can do:</p>
            <ul style="margin: 10px 0 0 0; color: #1e3a8a;">
                <li>Check your updated trip in the dashboard</li>
                <li>Accept other available shipments</li>
                <li>Continue with your remaining deliveries</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/traveler/trips" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                View My Trips →
            </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Thank you for using CrowdShip!<br>
            <strong>The CrowdShip Team</strong>
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
        <p>This is an automated message, please do not reply to this email.</p>
    </div>
</body>
</html>
            `,
        })

        console.log('✅ Shipment cancelled email sent to traveler:', travelerEmail)
        return { success: true }
    } catch (error) {
        console.error('❌ Failed to send shipment cancelled email to traveler:', error)
        return { success: false, error }
    }
}
