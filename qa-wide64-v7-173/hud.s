.segment "HUD"
; Keep the six-tile BP panel inside the card/portrait boundary.
; Preserve native special-enemy suppression; native fallback marks overflow.
 ldx $17
 lda $030e,x
 cmp #$23
 beq overflow
 cmp #$24
 beq overflow
 cmp #$29
 beq overflow
 jsr $70d2
 lda $08
 bne overflow
 ldy #1
 ldx #$1e
 jsr $b823
 jmp $b0d5
overflow:
 ldy #0
 ldx #$1e
 jsr $b0eb
 jmp $b0d5
