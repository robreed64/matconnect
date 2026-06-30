import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { showCta, ctaLabel } = attributes;

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Pricing Settings', 'matconnect' ) }>
                    <ToggleControl
                        label={ __( 'Show "Get started" button', 'matconnect' ) }
                        checked={ showCta }
                        onChange={ ( val ) => setAttributes( { showCta: val } ) }
                    />
                    { showCta && (
                        <TextControl
                            label={ __( 'Button label', 'matconnect' ) }
                            value={ ctaLabel }
                            onChange={ ( val ) => setAttributes( { ctaLabel: val } ) }
                        />
                    ) }
                </PanelBody>
            </InspectorControls>
            <div { ...useBlockProps( { className: 'matconnect-block-placeholder' } ) }>
                <span className="dashicons dashicons-tag" />
                <strong>{ __( 'MatConnect Pricing', 'matconnect' ) }</strong>
                <p>{ __( 'Displays live membership plans.', 'matconnect' ) }</p>
            </div>
        </>
    );
}
