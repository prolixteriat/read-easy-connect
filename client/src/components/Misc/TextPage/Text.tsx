import React from 'react';

// -----------------------------------------------------------------------------

export const ContactBlock = (): React.JSX.Element => (
  <>
    <h1 className='text-2xl pt-5 mb-5'>Contact Us</h1>
    <p>For general support enquiries, please email&nbsp; 
      <a href='mailto:hcdataprotection@readeasy.org.uk?subject=Read%20Easy%20Connect%20Query' className='underline'>hcdataprotection@readeasy.org.uk</a></p>
  </>
);
// -----------------------------------------------------------------------------

export const IntroBlock = (): React.JSX.Element  => (
  <>
  <h1 className='text-2xl pt-5 mb-5'>Welcome to Read Easy Connect</h1>
      
  <p>
    Please select the <strong>Login</strong> option in the menu bar
    and enter your email address and Connect password. 
  </p>
              
  </>
);
// -----------------------------------------------------------------------------

export const PrivacyBlock = (): React.JSX.Element  => (
  <>
    <h1 className='text-2xl pt-5 mb-5'>Privacy Policy</h1>
    <section id='compliance' aria-labelledby='complianceHeading'>
        <h2 id='complianceHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>1. Compliance with Read Easy Policy and UK GDPR</h2>
        <p>All personal data processed through Read Easy Connect (the 'App') is handled in full compliance with:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>The <strong>Read Easy Data Protection Policy</strong>: <a href='https://readeasy.org.uk/privacy-policy/' target='_blank' rel='noopener noreferrer'>https://readeasy.org.uk/privacy-policy/</a></li>
          <li>The <strong>UK General Data Protection Regulation (UK GDPR)</strong> and related data protection laws</li>
        </ul>
        <p><strong>All users of the App must adhere to the Read Easy Data Protection Policy</strong> when accessing, entering, viewing, or managing any personal data within the App.</p>
      </section>

      <section id='personal-data' aria-labelledby='personalDataHeading'>
        <h2 id='personalDataHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>2. Personal Data</h2>
        <p>Read Easy Connect processes personal data only where necessary to support Read Easy activities and service delivery. Examples of personal data may include:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>Names</li>
          <li>Contact details</li>
          <li>App usage data directly related to service delivery</li>
        </ul>
        <p>Processing is limited to what is required for legitimate operational purposes and is conducted in accordance with UK GDPR principles (data minimisation, accuracy, secure handling).</p>
      </section>

      <section id='lawful-basis' aria-labelledby='lawfulBasisHeading'>
        <h2 id='lawfulBasisHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>3. Lawful Basis for Processing</h2>
        <p>Personal data is processed on lawful bases outlined under UK GDPR, including:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li><strong>Legitimate interests</strong> — to support delivery and administration of Read Easy services</li>
          <li><strong>Consent</strong>, where explicitly required</li>
          <li><strong>Legal obligations</strong>, where applicable</li>
        </ul>
      </section>

      <section id='storage-security' aria-labelledby='storageSecurityHeading'>
        <h2 id='storageSecurityHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>4. Data Storage and Security</h2>
        <p>Reasonable technical and organisational measures are implemented to protect personal data against unauthorised access, loss, misuse, or alteration. Data is:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>Accessed only by authorised individuals who require it for legitimate purposes</li>
          <li>Stored securely in line with the Read Easy Data Protection Policy</li>
          <li>Retained only for as long as necessary to fulfil operational or legal requirements</li>
        </ul>
      </section>

      <section id='local-storage' aria-labelledby='localStorageHeading'>
        <h2 id='localStorageHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>5. Browser Local Storage</h2>
          <p><strong>Important:</strong> Read Easy Connect uses browser <em>local storage</em> strictly for essential app functionality (for example, saving UI preferences or session-related settings).</p>
          <p>Local storage is <strong>not used to store any personal data</strong> and is <strong>not used for advertising, marketing, tracking, or analytics</strong>.</p>
      </section>

      <section id='data-sharing' aria-labelledby='dataSharingHeading'>
        <h2 id='dataSharingHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>6. Data Sharing</h2>
        <p>Personal data processed through the App is not shared with third parties except where:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>Required by law</li>
          <li>Necessary to comply with safeguarding, regulatory, or contractual obligations</li>
          <li>Covered by the Read Easy Data Protection Policy</li>
        </ul>
        <p>No personal data is sold or used for marketing purposes.</p>
      </section>

      <section id='user-responsibilities' aria-labelledby='userResponsibilitiesHeading'>
        <h2 id='userResponsibilitiesHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>7. User Responsibilities</h2>
        <p>All users are responsible for:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>Complying with the <strong>Read Easy Data Protection Policy</strong></li>
          <li>Ensuring any personal data entered or accessed is handled lawfully</li>
          <li>Reporting any suspected data breaches or security issues promptly according to organisational procedures</li>
        </ul>
      </section>

      <section id='rights' aria-labelledby='rightsHeading'>
        <h2 id='rightsHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>8. Individual Rights</h2>
        <p>Under UK GDPR, individuals have rights including:</p>
        <ul className='list-disc list-inside ml-4 space-y-1'>
          <li>The right to access their data</li>
          <li>The right to request corrections or updates</li>
          <li>The right to request erasure, where applicable</li>
          <li>The right to restrict or object to processing</li>
        </ul>
        <p>Requests relating to personal data should be made in line with the contact information provided in the Read Easy Data Protection Policy.</p>
      </section>

      <section id='further-info' aria-labelledby='furtherInfoHeading'>
        <h2 id='furtherInfoHeading' className='text-xl font-semibold text-gray-800 mt-6 mb-3'>9. Further Information</h2>
        <p>For full details of how Read Easy UK manages personal data, including how to contact the organisation regarding privacy matters, please refer to the official policy:</p>
        <p><a href='https://readeasy.org.uk/privacy-policy/' target='_blank' rel='noopener noreferrer'>Read Easy Data Protection Policy</a></p>
      </section>  </>
);
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------

