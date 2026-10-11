.setcpu "6502"
.segment "CODE"
jmp tap
jmp capped
tap:
 jsr capture
 lda #0
 ora $7eba
 rts
capped:
 jsr capture
 lda #$ff
 sta $a8
 rts
; Read-only telemetry of native quotient before 16-bit damage saturation.
; Five records: 40 significant bits + whole-byte exponent, in free $7170-$718d.
; $718e valid-slot mask; $718f page. No combat operands/results are changed.
capture:
 php
 pha
 txa
 pha
 tya
 pha
 lda $0f
 pha
 lda $73fe
 cmp #$b5
 beq :+
 jmp done
:
 lda $7e62
 beq :+
 jmp done
:
 lda $034d
 cmp #73
 bcc :+
 jmp done
:
 ldx #0
 ldy #0
slot:
 cmp #18
 bcc slot_ready
 sec
 sbc #18
 pha
 txa
 clc
 adc #6
 tax
 pla
 iny
 jmp slot
slot_ready:
 cmp #0
 beq :+
 jmp done
:
 tya
 pha
 lda $7370
 cmp $718f
 beq same_page
 sta $718f
 lda #0
 sta $718e
same_page:
 lda #0
 ldy #11
denominator:
 ora $7ec4,y
 dey
 bpl denominator
 cmp #0
 bne finite
 lda #$ff
 sta $7175,x
 lda #0
 sta $7170,x
 sta $7171,x
 sta $7172,x
 sta $7173,x
 sta $7174,x
 jmp mark
finite:
 ldy #11
highest:
 lda $7eb8,y
 bne found
 dey
 bpl highest
 ldy #0
found:
 tya
 sec
 sbc #4
 bcs shifted
 lda #0
shifted:
 sta $7175,x
 tay
 lda #5
 sta $0f
copy:
 lda $7eb8,y
 sta $7170,x
 inx
 iny
 dec $0f
 bne copy
mark:
 pla
 tay
 lda bits,y
 ora $718e
 sta $718e
done:
 pla
 sta $0f
 pla
 tay
 pla
 tax
 pla
 plp
 rts
bits: .byte 1,2,4,8,16
