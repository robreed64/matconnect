import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { maxItems } = attributes;

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Testimonials Settings', 'matconnect' ) }>
                    <RangeControl
                        label={ __( 'Max testimonials (0 = all)', 'matconnect' ) }
                        value={ maxItems }
                        onChange={ ( val ) => setAttributes( { maxItems: val } ) }
                        min={ 0 }
                        max={ 20 }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...useBlockProps( { className: 'matconnect-block-placeholder' } ) }>
                <span className="dashicons dashicons-format-quote" />
                <strong>{ __( 'MatConnect Testimonials', 'matconnect' ) }</strong>
                <p>{ maxItems > 0
                    ? __( 'Shows up to', 'matconnect' ) + ` ${ maxItems } ` + __( 'testimonials.', 'matconnect' )
                    : __( 'Shows all testimonials.', 'matconnect' )
                }</p>
            </div>
        </>
    );
}
