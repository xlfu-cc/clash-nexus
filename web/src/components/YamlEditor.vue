<template>
  <div class="code-editor" ref="editorContainer"></div>
</template>

<script>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { bracketMatching, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const yamlHighlighting = HighlightStyle.define([
  { tag: tags.keyword, color: '#7dd3fc' },
  { tag: [tags.atom, tags.bool, tags.number], color: '#fbbf24' },
  { tag: tags.string, color: '#86efac' },
  { tag: tags.propertyName, color: '#93c5fd' },
  { tag: tags.comment, color: '#718096', fontStyle: 'italic' },
  { tag: tags.punctuation, color: '#cbd5e1' }
])

export default {
  name: 'YamlEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    readonly: {
      type: Boolean,
      default: false
    },
    height: {
      type: String,
      default: 'min(58vh, 640px)'
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editorContainer = ref(null)
    let view = null

    onMounted(() => {
      const updateListener = EditorView.updateListener.of(update => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })

      const state = EditorState.create({
        doc: props.modelValue,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          yaml(),
          syntaxHighlighting(yamlHighlighting),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          updateListener,
          EditorView.lineWrapping,
          EditorState.readOnly.of(props.readonly),
          EditorView.theme({
            '&': {
              width: '100%',
              height: props.height,
              color: '#dce5f0',
              backgroundColor: '#12161b',
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, monospace",
              fontSize: '10px'
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, monospace"
            },
            '.cm-gutters': {
              color: '#718096',
              backgroundColor: '#171c22',
              borderRight: '1px solid #2d3744'
            },
            '.cm-activeLine': {
              backgroundColor: '#1d2731'
            },
            '.cm-activeLineGutter': {
              backgroundColor: '#17363e',
              color: '#a5f3fc'
            },
            '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
              backgroundColor: '#1e4b58'
            },
            '.cm-cursor, .cm-dropCursor': {
              borderLeftColor: '#22b8cf'
            }
          })
        ]
      })

      view = new EditorView({
        state,
        parent: editorContainer.value
      })
    })

    onUnmounted(() => {
      if (view) {
        view.destroy()
      }
    })

    // Watch for external value changes
    watch(
      () => props.modelValue,
      newValue => {
        if (view && newValue !== view.state.doc.toString()) {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: newValue
            }
          })
        }
      }
    )

    return { editorContainer }
  }
}
</script>

<style scoped>
.code-editor {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
</style>
