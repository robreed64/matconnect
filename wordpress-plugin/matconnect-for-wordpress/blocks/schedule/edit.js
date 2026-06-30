import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
    const { daysAhead } = attributes;

    return (
        <>
            <InspectorControls>
                <PanelBody title={ __( 'Schedule Settings', 'matconnect' ) }>
                    <RangeControl
                        label={ __( 'Days ahead', 'matconnect' ) }
                        value={ daysAhead }
                        onChange={ ( val ) => setAttributes( { daysAhead: val } ) }
                        min={ 1 }
                        max={ 14 }
                    />
                </PanelBody>
            </InspectorControls>
            <div { ...useBlockProps( { className: 'matconnect-block-placeholder' } ) }>
                <span className="dashicons dashicons-calendar" />
                <strong>{ __( 'MatConnect Schedule', 'matconnect' ) }</strong>
                <p>{ __( 'Shows the next', 'matconnect' ) } { daysAhead } { __( 'days of classes.', 'matconnect' ) }</p>
            </div>
        </>
    );
}
