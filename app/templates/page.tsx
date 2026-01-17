'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { templatesApi, Template } from '@/lib/api'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables: '',
    description: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await templatesApi.getAll()
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({ name: '', content: '', variables: '', description: '' })
    setShowModal(true)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      variables: template.variables.join(', '),
      description: template.description || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const variables = formData.variables.split(',').map(v => v.trim()).filter(v => v)
      
      if (editingTemplate) {
        await templatesApi.update(editingTemplate.id, {
          name: formData.name,
          content: formData.content,
          variables,
          description: formData.description,
        })
      } else {
        await templatesApi.create({
          name: formData.name,
          content: formData.content,
          variables,
          description: formData.description,
        })
      }
      
      setShowModal(false)
      loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await templatesApi.delete(id)
      loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-600 mt-2">Kelola template pesan WhatsApp</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Template
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No templates found</p>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">{template.content}</p>
                {template.description && (
                  <p className="text-gray-500 text-xs mb-4">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-4">
                  Created: {new Date(template.createdAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Hello {{name}}, your balance is {{balance}}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variables (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.variables}
                    onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="name, balance"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingTemplate ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
