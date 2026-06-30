import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
    return (
        <div { ...useBlockProps( { className: 'matconnect-block-placeholder' } ) }>
            <span className="dashicons dashicons-editor-help" />
            <strong>{ __( 'MatConnect FAQ', 'matconnect' ) }</strong>
            <p>{ __( 'Renders the FAQ accordion from your MatConnect website settings.', 'matconnect' ) }</p>
        </div>
    );
}
