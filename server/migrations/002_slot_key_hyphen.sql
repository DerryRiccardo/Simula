-- +migrate Up

-- Slot key dari pembuat case client memakai tanda hubung (mis. "design-doc").
ALTER TABLE case_slots DROP CONSTRAINT case_slots_slot_key_check;
ALTER TABLE case_slots ADD CONSTRAINT case_slots_slot_key_check CHECK (slot_key ~ '^[a-z][a-z0-9_-]*$');

-- rollback

ALTER TABLE case_slots DROP CONSTRAINT case_slots_slot_key_check;
ALTER TABLE case_slots ADD CONSTRAINT case_slots_slot_key_check CHECK (slot_key ~ '^[a-z][a-z0-9_]*$');
