import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextareaControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { successMessage } = attributes;

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Form Settings', 'matconnect' ) }>
                    <TextareaControl
                        label={ __( 'Success message', 'matconnect' ) }
                        value={ successMessage }
                        placeholder={ __( "Thanks! We'll be in touch soon.", 'matconnect' ) }
                        onChange={ ( val ) => setAttributes( { successMessage: val } ) }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...useBlockProps( { className: 'matconnect-block-placeholder' } ) }>
                <span className="dashicons dashicons-email" />
                <strong>{ __( 'MatConnect Lead Form', 'matconnect' ) }</strong>
                <p>{ __( 'Captures name, email, phone, and interest. Submitted leads appear in MatConnect.', 'matconnect' ) }</p>
            </div>
        </>
    );
}
