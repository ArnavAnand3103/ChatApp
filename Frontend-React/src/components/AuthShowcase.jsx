export default function AuthShowcase() {
    return (
        <div 
            className="auth-showcase-pane" 
            style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                padding: 0,
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'stretch'
            }}
        >
            <img
                src="/auth-showcase.jpg"
                alt="Landscape Scenery"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                }}
            />
        </div>
    );
}
