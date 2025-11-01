<script>
import { ExtendedDataType } from "../utils.js"

export default {
  name: "FilterCondition",
  emits: ["updateField", "updateMethod", "deleteCondition"],
  props: {
    condition: {
      type: Object,
      required: true,
      validator(value) {
        return value.constructor === Object
      },
    },
    fieldNames: {
      type: Array,
      required: true,
    },
    numericMethodNames: {
      type: Array,
      required: true,
    },
    nominalMethodNames: {
      type: Array,
      required: true,
    },
    dateMethodNames: {
      type: Array,
      required: true,
    },
  },
  computed: {
    isNumeric() {
      return this.condition.dataType === ExtendedDataType.NUMERIC
    },
    isDate() {
      return this.condition.dataType === ExtendedDataType.DATE
    },
    // Get arguments array, handling backward compatibility
    conditionArguments() {
      if (this.condition.arguments) {
        return this.condition.arguments
      } else if (this.condition.argument !== undefined) {
        return [this.condition.argument]
      }
      return ['']
    },
  },
  methods: {
    updateField(newFieldName) {
      if (this.fieldNames.includes(newFieldName)) {
        this.$emit("updateField", this.condition, newFieldName)
      }
    },
    updateMethod(newMethod) {
      this.$emit("updateMethod", this.condition, newMethod)
    },
    updateArgument(index, value) {
      // Ensure arguments array exists
      if (!this.condition.arguments) {
        this.condition.arguments = this.conditionArguments
      }
      // Update specific argument
      this.condition.arguments[index] = value
      
      // Clean up old single argument if it exists
      if (this.condition.argument !== undefined) {
        delete this.condition.argument
      }
    },
  },
}
</script>

<template>
  <div class="space-x-2">
    <slot name="fieldUpdation" v-bind="{ fieldNames, condition, updateField }">
      <select
        v-model="condition.fieldName"
        @change="updateField($event.target.value)"
        data-testId="field-name-select"
      >
        <option v-for="field in fieldNames" :key="field" :value="field">
          {{ field }}
        </option>
      </select>
    </slot>
    <slot
      name="methodUpdation"
      v-bind="{
        numericMethodNames: isNumeric && numericMethodNames,
        nominalMethodNames: !isNumeric && !isDate && nominalMethodNames,
        dateMethodNames: isDate && dateMethodNames,
        condition,
      }"
    >
      <select 
        :value="condition.method" 
        @change="updateMethod($event.target.value)"
        data-testId="method-select"
      >
        <option
          v-for="method in isNumeric ? numericMethodNames : isDate ? dateMethodNames : nominalMethodNames"
          :key="method"
          :value="method"
        >
          {{ method }}
        </option>
      </select>
    </slot>
    <slot name="argumentUpdation" :condition="condition" :arguments="conditionArguments">
      <template v-for="(argument, index) in conditionArguments" :key="index">
        <input
          :type="isDate ? 'date' : 'text'"
          :value="argument"
          @input="updateArgument(index, $event.target.value)"
          :data-testId="`argument-input-${index}`"
          :placeholder="index === 0 ? 'Value' : index === 1 ? 'Start' : 'End'"
        />
        <span v-if="index < conditionArguments.length - 1" style="margin: 0 0.25rem;">and</span>
      </template>
    </slot>
    <slot
      name="conditionDeletion"
      :deleteCondition="() => $emit('deleteCondition', condition)"
    >
      <button @click="$emit('deleteCondition', condition)" data-testId="remove-condition-button">x</button>
    </slot>
  </div>
</template>
