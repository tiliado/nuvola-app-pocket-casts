/*
 * Copyright 2017-2018 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Create media player component
  var player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  var PlaybackState = Nuvola.PlaybackState
  var PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  var WebApp = Nuvola.$WebApp()

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    var state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    var track = {
      title: null,
      artist: null,
      album: null,
      artLocation: null,
      rating: null
    }
    var elements = this._getElements()
    var elm
    if (elements.audio) {
      elm = elements.audio.querySelector('.player_podcast_title')
      track.artist = elm ? (elm.innerText || null) : null
      elm = elements.audio.querySelector('.player_episode')
      track.title = elm ? (elm.innerText || null) : null
      elm = elements.audio.querySelector('.player_artwork img') || elements.audio.querySelector('.player-image img')
      track.artLocation = elm ? (elm.src.replace('/webp/', '/').replace('.webp', '.jpg') || null) : null
    }
    var state = PlaybackState.UNKNOWN
    if (elements.play) {
      state = PlaybackState.PAUSED
    } else if (elements.pause) {
      state = PlaybackState.PLAYING
    }
    var time = this._parseTime(elements)
    var volume = elements.volumeBarPos ? elements.volumeBarPos.getAttribute('aria-valuenow') * 1 : null

    track.length = time.total
    player.setTrack(track)
    player.setPlaybackState(state)
    player.setCanGoPrev(!!elements.prev)
    player.setCanGoNext(!!elements.next)
    player.setCanPlay(!!elements.play)
    player.setCanPause(!!elements.pause)
    player.setCanSeek(!!elements.seekBar)
    player.setCanChangeVolume(!!elements.volumeBar)
    player.setTrackPosition(time.current)
    player.updateVolume(volume)

    // Schedule the next update
    setTimeout(this.update.bind(this), 300)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    var elements = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elements.play) {
          Nuvola.clickOnElement(elements.play)
        } else if (elements.pause) {
          Nuvola.clickOnElement(elements.pause)
        }
        break
      case PlayerAction.PLAY:
        if (elements.play) {
          Nuvola.clickOnElement(elements.play)
        }
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        if (elements.pause) {
          Nuvola.clickOnElement(elements.pause)
        }
        break
      case PlayerAction.PREV_SONG:
        if (elements.pause) {
          Nuvola.clickOnElement(elements.prev)
        }
        break
      case PlayerAction.NEXT_SONG:
        if (elements.pause) {
          Nuvola.clickOnElement(elements.next)
        }
        break
      case PlayerAction.SEEK:
        if (elements.seekBar) {
          var time = this._parseTime(elements)
          if (time.total && param > 0 && param <= time.total) {
            Nuvola.clickOnElement(elements.seekBar, param / time.total, 0.5)
          }
        }
        break
      case PlayerAction.CHANGE_VOLUME:
        if (elements.volumeBar) {
          Nuvola.clickOnElement(elements.volumeBar, param, 0.5)
        }
        break
    }
  }

  WebApp._parseTime = function (elements) {
    var time = {
      total: null,
      current: null,
      remaining: null
    }
    if (elements.currentTime && elements.remainingTime) {
      time.current = Nuvola.parseTimeUsec(elements.currentTime.innerText || null)
      var remainingTime = elements.remainingTime.innerText || null
      if (time.current && remainingTime) {
        time.remaining = Nuvola.parseTimeUsec(remainingTime.substring(1))
        time.total = time.current + time.remaining
      }
    }
    return time
  }

  WebApp._getElements = function () {
    var elms = {
      players: document.querySelector('div.player-controls'),
      audio: null,
      play: null,
      pause: null,
      prev: null,
      next: null
    }
    if (elms.players) {
      elms.audio = elms.players
    }
    if (elms.audio) {
      elms.prev = elms.audio.querySelector('.skip_back_button')
      elms.next = elms.audio.querySelector('.skip_forward_button')
      elms.play = elms.audio.querySelector('.play_pause_button')
      elms.seekBar = elms.audio.querySelector('.seek-bar .tracks')
      elms.currentTime = elms.audio.querySelector('.current-time')
      elms.remainingTime = elms.audio.querySelector('.time-remaining')
      elms.volumeBarPos = elms.audio.querySelector('.volume-slider [role="slider"]')
      elms.volumeBar = elms.audio.querySelector('.volume-slider [class|="styled__VolumeBarTouch"]')

      if (elms.play && elms.play.getAttribute('aria-pressed') === 'true') {
        elms.pause = elms.play
        elms.play = null
      }
    }
    return elms
  }

  WebApp.start()
})(this) // function(Nuvola)
