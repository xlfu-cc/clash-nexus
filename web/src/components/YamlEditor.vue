<template>
  <div class="code-editor" ref="editorContainer"></div>
</template>

<script>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'

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
          oneDark,
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          updateListener,
          EditorView.lineWrapping,
          EditorState.readOnly.of(props.readonly),
          EditorView.theme({
            '&': {
              height: '400px',
              width: '100%',
              height: props.height,
              fontSize: '14px'
            },
            '.cm-scroller': {
              overflow: 'auto'
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
