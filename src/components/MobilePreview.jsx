export default function MobilePreview({ jsonContent }) {
  const renderComponent = (component) => {
    if (!component || typeof component !== 'object') {
      return null
    }

    const { type, data, child, children } = component

    switch (type) {
      case 'scaffold':
        return (
          <div className="w-full h-full bg-white">
            {component.body && renderComponent(component.body)}
          </div>
        )

      case 'center':
        return (
          <div className="flex items-center justify-center w-full h-full">
            {child && renderComponent(child)}
          </div>
        )

      case 'column':
        return (
          <div className="flex flex-col">
            {children && children.map((child, index) => (
              <div key={index}>{renderComponent(child)}</div>
            ))}
          </div>
        )

      case 'row':
        return (
          <div className="flex flex-row">
            {children && children.map((child, index) => (
              <div key={index}>{renderComponent(child)}</div>
            ))}
          </div>
        )

      case 'text':
        return (
          <span className="text-gray-800" style={component.style}>
            {data || ''}
          </span>
        )

      case 'container':
        return (
          <div 
            className="p-4"
            style={component.style}
          >
            {child && renderComponent(child)}
          </div>
        )

      case 'image':
        return (
          <img 
            src={data} 
            alt="preview" 
            className="max-w-full"
            style={component.style}
          />
        )

      case 'button':
        return (
          <button 
            className="px-4 py-2 bg-emerald-500 text-white rounded"
            style={component.style}
          >
            {data || 'Button'}
          </button>
        )

      default:
        return (
          <div className="text-gray-500 text-sm p-2 border border-dashed border-gray-300">
            {type || 'unknown'}
          </div>
        )
    }
  }

  let parsedContent
  try {
    parsedContent = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent
  } catch (err) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center">
        Invalid JSON format
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-auto bg-gray-100">
      {parsedContent ? renderComponent(parsedContent) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No content to preview
        </div>
      )}
    </div>
  )
}
